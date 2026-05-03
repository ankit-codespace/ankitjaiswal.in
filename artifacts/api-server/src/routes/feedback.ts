import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { feedback } from "@workspace/db/schema";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Per-IP rate limit: 5 submissions per 10 minutes. The vast majority of
 * humans send at most one or two messages; anyone above the threshold is
 * either retrying after a network hiccup (still allowed once or twice) or
 * is automated. We respond with a 429 carrying a friendly message rather
 * than silently dropping, so legitimate users on shared NATs can self-correct.
 */
const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages. Please try again in a few minutes." },
});

/**
 * Strict input schema. Notable choices:
 *  - `type` is whitelisted (no free-form values land in storage / email).
 *  - `email` is optional but, if present, must parse as RFC-ish; empty string
 *    is coerced to `undefined` so the column stays NULL rather than "".
 *  - `message` is length-bounded both ways: under 5 chars is almost always
 *    a misclick; over 5,000 is either pasting a novel or a payload.
 *  - `website` is the honeypot — visible only to bots that auto-fill every
 *    field they see. If it's present and non-empty we silently 200 so the
 *    bot thinks it succeeded and moves on (no signal to retry).
 *  - `pageUrl` is recorded for triage but capped to 2k to stop log-flooding.
 */
const feedbackBodySchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  // Email is REQUIRED — every reply needs somewhere to land. The Zod schema
  // enforces this server-side as the source of truth; the client also blocks
  // empty submissions, but never trust the client.
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(320)
    .pipe(z.email("Please enter a valid email address.")),
  message: z
    .string()
    .trim()
    .min(5, "Message is a bit short — give me a few more details.")
    .max(5000, "Message is too long. Please trim it under 5,000 characters."),
  pageUrl: z.string().trim().max(2048).optional(),
  // Honeypot — accepted by the schema (so a tripped honeypot doesn't surface
  // a 400 to bots OR to humans whose password manager autofilled the hidden
  // "Website" field). The actual silent-drop happens further down.
  website: z.string().max(2048).optional(),
});

/**
 * Pull a usable client IP. Express's req.ip honours `trust proxy`, but in
 * Replit / behind any proxy we're more interested in the leftmost
 * X-Forwarded-For entry. We fall back to req.ip then to "unknown".
 */
function clientIp(req: import("express").Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0]!.trim();
  }
  return req.ip ?? "unknown";
}

/**
 * Best-effort HTML escape for the email body. We render the user's message
 * inside an HTML email, so we have to neutralise <, >, &, ", '. This is a
 * defense-in-depth measure — the email client itself sandboxes content, but
 * we avoid emitting anything that looks like markup in the first place.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send the notification email via Resend. Imported lazily so the server
 * still boots (and DB writes still succeed) when RESEND_API_KEY isn't set
 * yet — useful during initial setup. Returns true on success, false on any
 * failure (logged but not surfaced to the user — they shouldn't care that
 * one of two delivery channels hiccupped).
 */
async function sendFeedbackEmail(payload: {
  type: string;
  email?: string;
  message: string;
  pageUrl?: string;
  ip: string;
  userAgent: string;
  id: number;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  // Always deliver to the single canonical inbox. Hard-coded by user request
  // — there is no second mailbox to fall back to.
  const to = "contact@ankitjaiswal.in";
  const from = process.env.FEEDBACK_FROM_EMAIL ?? "Ankit Jaiswal Site <onboarding@resend.dev>";

  if (!apiKey) {
    logger.warn({ id: payload.id }, "RESEND_API_KEY not set — skipping email, DB row saved");
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    // Inbox-glance subject: "[Bug] Can't export PDF on Safari mobile — ankitjaiswal.in"
    // Human-readable category prefix + first line of the actual message lets
    // you triage from the preview pane without opening the email. Long
    // messages are truncated with an ellipsis at a word boundary if possible.
    const categoryLabel =
      payload.type === "bug" ? "Bug"
      : payload.type === "feature" ? "Feature"
      : "Message";
    const firstLine = payload.message.split("\n")[0]!.trim();
    const snippetSrc = firstLine.length > 0 ? firstLine : payload.message.trim();
    const MAX_SUBJECT_SNIPPET = 70;
    let snippet = snippetSrc.replace(/\s+/g, " ");
    if (snippet.length > MAX_SUBJECT_SNIPPET) {
      const cut = snippet.slice(0, MAX_SUBJECT_SNIPPET);
      const lastSpace = cut.lastIndexOf(" ");
      snippet = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
    }
    const subject = `[${categoryLabel}] ${snippet} — ankitjaiswal.in`;

    // Section header label inside the email body — friendlier than the
    // raw enum value ("bug" → "Bug report").
    const sectionLabel =
      payload.type === "bug" ? "Bug report"
      : payload.type === "feature" ? "Feature request"
      : "Message";

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0D1117;">
        <h2 style="margin:0 0 16px;font-size:18px;">New ${escapeHtml(sectionLabel.toLowerCase())} from your site</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.55;">
          <tr><td style="padding:6px 0;color:#666;width:110px;">Type</td><td><strong>${escapeHtml(sectionLabel)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666;">From</td><td>${payload.email ? escapeHtml(payload.email) : "<em style='color:#999;'>not provided</em>"}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Page</td><td>${payload.pageUrl ? `<a href="${escapeHtml(payload.pageUrl)}">${escapeHtml(payload.pageUrl)}</a>` : "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">IP</td><td><code>${escapeHtml(payload.ip)}</code></td></tr>
          <tr><td style="padding:6px 0;color:#666;vertical-align:top;">User-Agent</td><td style="color:#666;font-size:12px;">${escapeHtml(payload.userAgent.slice(0, 200))}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Record</td><td>#${payload.id}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;background:#FAFAF7;padding:16px;border-radius:8px;border:1px solid #EFEDE7;">${escapeHtml(payload.message)}</div>
        ${payload.email ? `<p style="margin-top:20px;font-size:13px;color:#666;">Reply directly to this email to respond to <strong>${escapeHtml(payload.email)}</strong>.</p>` : ""}
      </div>
    `;

    const result = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      // Honour user's email as reply-to when present, so hitting "Reply" in
      // your inbox goes back to the visitor instead of to Resend.
      replyTo: payload.email,
    });

    if (result.error) {
      logger.error({ err: result.error, id: payload.id }, "Resend rejected feedback email");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err, id: payload.id }, "Failed to send feedback email");
    return false;
  }
}

router.post("/feedback", feedbackLimiter, async (req, res) => {
  let parsed;
  try {
    parsed = feedbackBodySchema.parse(req.body);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({
        message: err.issues?.[0]?.message ?? err.errors?.[0]?.message ?? "Invalid input.",
      });
      return;
    }
    throw err;
  }

  // Honeypot tripped — pretend success. Bots don't get a signal to retry.
  if (parsed.website && parsed.website.length > 0) {
    logger.info({ ip: clientIp(req) }, "feedback honeypot tripped");
    res.status(200).json({ ok: true });
    return;
  }

  const ip = clientIp(req);
  const ua = (req.headers["user-agent"] ?? "").toString().slice(0, 512);

  // Try to persist first, but tolerate DB outages — losing a feedback
  // submission to a transient infra issue is much worse than a missing row.
  // We capture the row id when available so the email subject/body can
  // reference it for cross-correlation.
  let rowId: number | null = null;
  try {
    const [row] = await db
      .insert(feedback)
      .values({
        type: parsed.type,
        email: parsed.email,
        message: parsed.message,
        pageUrl: parsed.pageUrl,
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: ua,
      })
      .returning();
    rowId = row?.id ?? null;
  } catch (err) {
    logger.error({ err }, "feedback DB insert failed — continuing to email-only delivery");
  }

  const emailed = await sendFeedbackEmail({
    id: rowId ?? 0,
    type: parsed.type,
    email: parsed.email,
    message: parsed.message,
    pageUrl: parsed.pageUrl,
    ip,
    userAgent: ua,
  });

  // If both channels failed, this is a real outage — surface a 503 so the
  // client retains the user's input and can offer a retry. Otherwise 201.
  if (rowId === null && !emailed) {
    res.status(503).json({
      message: "Couldn't deliver your message right now. Please try again in a moment.",
    });
    return;
  }

  res.status(201).json({ ok: true });
});

export default router;

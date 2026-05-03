import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { MessageSquarePlus, X, Bug, Sparkles, MessageCircle, Send, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Feedback system — split into three pieces by deliberate UX request:
 *
 *   FeedbackProvider      — mounts the modal once at the app root and exposes
 *                           an open() function via React context. Always
 *                           present, never visible until triggered.
 *
 *   useFeedback()         — hook returning { open } so any component can
 *                           pop the modal without prop drilling.
 *
 *   FeedbackHeaderButton  — small inline pill for tool-page headers. Calm,
 *                           always visible while the user works, never
 *                           floating over content.
 *
 *   FeedbackInlineCard    — large prompt card for end-of-page placement,
 *                           catching users after they've used the tool and
 *                           formed an opinion.
 *
 * No floating sticky button — the previous global widget was removed at the
 * user's request because premium tools don't have those.
 *
 * Email is REQUIRED: every reply needs a valid address. The modal validates
 * format client-side and the API server enforces the same rule.
 */

type FeedbackContextValue = { open: () => void };
const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    // Fail soft in case a trigger is rendered outside the provider — log
    // a console error but don't crash the page.
    return {
      open: () => console.error("useFeedback() called outside <FeedbackProvider>"),
    };
  }
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <FeedbackContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </FeedbackContext.Provider>
  );
}

/**
 * Header pill button. Pair with the existing controls in a tool's top bar.
 * Variants:
 *   - "default" — full pill with label text (best for desktop toolbars).
 *   - "icon"    — icon-only square (use in cramped headers or mobile).
 */
export function FeedbackHeaderButton({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "icon";
  className?: string;
}) {
  const { open } = useFeedback();
  return (
    <button
      type="button"
      onClick={open}
      className={`fb-hdr-btn ${variant === "icon" ? "fb-hdr-btn-icon" : ""} ${className}`}
      aria-label="Send feedback or report a bug"
      title="Send feedback"
    >
      <MessageSquarePlus size={14} strokeWidth={2} />
      {variant !== "icon" && <span>Feedback</span>}
    </button>
  );
}

/**
 * Inline call-to-action card. Drop near the bottom of a tool page after the
 * primary content but before the footer — this is where users land once
 * they've actually formed an opinion about the tool.
 */
export function FeedbackInlineCard() {
  const { open } = useFeedback();
  return (
    <div className="fb-inline">
      <div className="fb-inline-icon" aria-hidden="true">
        <MessageSquarePlus size={18} strokeWidth={1.8} />
      </div>
      <div className="fb-inline-body">
        <div className="fb-inline-title">Spotted a bug? Wishing for a feature?</div>
        <div className="fb-inline-sub">
          Tell Ankit — every message lands directly in his inbox and gets a personal reply.
        </div>
      </div>
      <button type="button" onClick={open} className="fb-inline-cta">
        Send feedback
      </button>
    </div>
  );
}

/* ────────────────────────────── Modal ────────────────────────────── */

function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Focus the email field on open — it's the first required input now.
  useEffect(() => {
    if (open && !sent) {
      const t = setTimeout(() => emailRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, sent]);

  // Esc to close, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Reset the "sent" success state shortly after closing so reopening is fresh.
  useEffect(() => {
    if (!open && sent) {
      const t = setTimeout(() => {
        setSent(false);
        setMessage("");
        setEmail("");
      }, 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, sent]);

  // Lightweight client-side email check. Server-side Zod validation is the
  // source of truth — this just keeps the user from a network round-trip
  // for an obvious typo.
  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Email required", {
        description: "I need somewhere to reply — please add your email.",
      });
      emailRef.current?.focus();
      return;
    }
    if (!isEmailValid(trimmedEmail)) {
      toast.error("That email looks off", {
        description: "Double-check the format (you@example.com).",
      });
      emailRef.current?.focus();
      return;
    }

    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast.error("Message is a bit short", {
        description: "Give me a few more details so I can actually help.",
      });
      messageRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      // The API server is mounted at the artifact's BASE_URL + "api". In
      // production the website and api-server are reverse-proxied behind the
      // same origin, so a relative URL is the right move.
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          email: trimmedEmail,
          message: trimmed,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
          website, // honeypot — empty for humans
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Server returned ${res.status}`);
      }

      setSent(true);
      toast.success("Got it — thank you", {
        description: "Your message landed in my inbox. I read every one.",
      });
    } catch (err: any) {
      toast.error("Couldn't send", {
        description: err?.message ?? "Network blip — please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [type, email, message, website, submitting]);

  if (!open) return <FeedbackStyles />;

  return (
    <>
      <div
        className="fb-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="fb-modal">
          <button
            type="button"
            onClick={onClose}
            className="fb-close"
            aria-label="Close feedback form"
          >
            <X size={16} />
          </button>

          {sent ? (
            <div className="fb-success">
              <div className="fb-success-icon">
                <Check size={28} />
              </div>
              <h2 id="fb-title" className="fb-success-title">Message sent</h2>
              <p className="fb-success-body">
                Thank you — I read every message personally and reply within
                a day or two.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="fb-btn fb-btn-secondary"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="fb-form">
              <h2 id="fb-title" className="fb-title">Send feedback</h2>
              <p className="fb-subtitle">
                Found a bug, want a feature, or just saying hi? It all lands
                in my inbox.
              </p>

              {/* Type selector — segmented control */}
              <div className="fb-types" role="radiogroup" aria-label="Feedback type">
                {[
                  { val: "bug" as const, label: "Bug", icon: Bug },
                  { val: "feature" as const, label: "Feature", icon: Sparkles },
                  { val: "other" as const, label: "Other", icon: MessageCircle },
                ].map(({ val, label, icon: Icon }) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={type === val}
                    onClick={() => setType(val)}
                    className={`fb-type ${type === val ? "fb-type-active" : ""}`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              <label className="fb-field">
                <span className="fb-label">
                  Your email <span className="fb-required" aria-hidden="true">*</span>
                </span>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={320}
                  required
                  className="fb-input"
                />
                <span className="fb-help">So I can reply to you personally.</span>
              </label>

              <label className="fb-field">
                <span className="fb-label">
                  Message <span className="fb-required" aria-hidden="true">*</span>
                </span>
                <textarea
                  ref={messageRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "What went wrong? Steps to reproduce help a lot."
                      : type === "feature"
                      ? "What would you love to see? Even half-formed ideas are welcome."
                      : "Tell me what's on your mind…"
                  }
                  rows={5}
                  maxLength={5000}
                  required
                  className="fb-textarea"
                />
                <span className="fb-counter">{message.length}/5000</span>
              </label>

              {/* Honeypot — visually hidden, hidden from assistive tech,
                  but present in the DOM so dumb bots fill it in. */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>

              <div className="fb-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="fb-btn fb-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="fb-btn fb-btn-primary"
                >
                  {submitting ? (
                    <>
                      <span className="fb-spinner" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Send
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <FeedbackStyles />
    </>
  );
}

/* ─── Styles — kept colocated so the whole feedback system is one file ─── */

function FeedbackStyles() {
  return (
    <style>{`
      /* Header pill — sits inside a tool's existing top bar */
      .fb-hdr-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        background: transparent;
        border: 1px solid rgba(13,17,23,0.10);
        color: rgba(13,17,23,0.72);
        font-size: 12.5px;
        font-weight: 500;
        font-family: inherit;
        letter-spacing: -0.005em;
        cursor: pointer;
        transition: background .15s ease, color .15s ease, border-color .15s ease;
      }
      .fb-hdr-btn:hover {
        background: rgba(13,17,23,0.04);
        color: #0D1117;
        border-color: rgba(13,17,23,0.18);
      }
      .fb-hdr-btn:focus-visible {
        outline: 2px solid #0D1117;
        outline-offset: 2px;
      }
      @media (max-width: 600px) {
        .fb-hdr-btn span { display: none; }
        .fb-hdr-btn {
          width: 32px;
          padding: 0;
          justify-content: center;
          flex-shrink: 0;
        }
      }
      .fb-hdr-btn-icon {
        width: 32px;
        padding: 0;
        justify-content: center;
      }

      /* Dark-theme variant — when the host page is dark, just add the
         class .fb-hdr-dark to the button and we'll re-tone it. */
      .fb-hdr-btn.fb-hdr-dark {
        border-color: rgba(255,255,255,0.14);
        color: rgba(255,255,255,0.72);
      }
      .fb-hdr-btn.fb-hdr-dark:hover {
        background: rgba(255,255,255,0.06);
        color: #fff;
        border-color: rgba(255,255,255,0.26);
      }
      .fb-hdr-btn.fb-hdr-dark:focus-visible { outline-color: #fff; }

      /* Inline call-to-action card — for end-of-tool placement */
      .fb-inline {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 22px 26px;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
        border: 1px solid rgba(255,255,255,0.08);
        flex-wrap: wrap;
        max-width: 760px;
        margin-left: auto;
        margin-right: auto;
      }
      .fb-inline-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.78);
        border: 1px solid rgba(255,255,255,0.10);
      }
      .fb-inline-body {
        flex: 1;
        min-width: 200px;
      }
      .fb-inline-title {
        font-family: 'Sora', sans-serif;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        letter-spacing: -0.01em;
        margin-bottom: 4px;
      }
      .fb-inline-sub {
        font-size: 13.5px;
        color: rgba(255,255,255,0.62);
        line-height: 1.5;
      }
      .fb-inline-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        border-radius: 999px;
        background: #fff;
        color: #0D1117;
        font-size: 13px;
        font-weight: 500;
        font-family: inherit;
        border: none;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease;
      }
      .fb-inline-cta:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(255,255,255,0.10);
      }
      .fb-inline-cta:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
      }

      /* Light-theme inline card — add .fb-inline-light to host */
      .fb-inline.fb-inline-light {
        background: rgba(13,17,23,0.025);
        border-color: rgba(13,17,23,0.08);
      }
      .fb-inline.fb-inline-light .fb-inline-icon {
        background: rgba(13,17,23,0.04);
        color: rgba(13,17,23,0.72);
        border-color: rgba(13,17,23,0.10);
      }
      .fb-inline.fb-inline-light .fb-inline-title { color: #0D1117; }
      .fb-inline.fb-inline-light .fb-inline-sub { color: rgba(13,17,23,0.62); }
      .fb-inline.fb-inline-light .fb-inline-cta {
        background: #0D1117;
        color: #fff;
      }
      .fb-inline.fb-inline-light .fb-inline-cta:hover {
        box-shadow: 0 6px 16px rgba(13,17,23,0.12);
      }

      /* Modal */
      .fb-overlay {
        position: fixed;
        inset: 0;
        background: rgba(13, 17, 23, 0.55);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 10000;
        animation: fbFadeIn .18s ease;
      }
      @keyframes fbFadeIn { from { opacity: 0; } to { opacity: 1; } }

      .fb-modal {
        position: relative;
        width: 100%;
        max-width: 480px;
        background: #fff;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.10);
        animation: fbSlideUp .24s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes fbSlideUp {
        from { opacity: 0; transform: translateY(14px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .fb-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: rgba(13,17,23,0.55);
        cursor: pointer;
        transition: background .15s ease, color .15s ease;
      }
      .fb-close:hover { background: rgba(13,17,23,0.06); color: #0D1117; }
      .fb-close:focus-visible { outline: 2px solid #0D1117; outline-offset: 2px; }

      .fb-form { display: flex; flex-direction: column; gap: 18px; }

      .fb-title {
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.015em;
        color: #0D1117;
        margin: 0;
      }
      .fb-subtitle {
        font-size: 13.5px;
        color: rgba(13,17,23,0.62);
        margin: -10px 0 0;
        line-height: 1.5;
      }

      .fb-types {
        display: flex;
        gap: 6px;
        background: rgba(13,17,23,0.04);
        padding: 4px;
        border-radius: 10px;
      }
      .fb-type {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 7px;
        background: transparent;
        border: none;
        color: rgba(13,17,23,0.62);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background .15s ease, color .15s ease;
      }
      .fb-type:hover { color: #0D1117; }
      .fb-type-active {
        background: #fff;
        color: #0D1117;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(13,17,23,0.06);
      }

      .fb-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
      .fb-label {
        font-size: 12px;
        font-weight: 500;
        color: rgba(13,17,23,0.72);
        letter-spacing: -0.005em;
      }
      .fb-required {
        color: #E14B4B;
        font-weight: 600;
        margin-left: 2px;
      }
      .fb-help {
        font-size: 11.5px;
        color: rgba(13,17,23,0.45);
        margin-top: 2px;
      }
      .fb-input, .fb-textarea {
        width: 100%;
        padding: 10px 12px;
        font-size: 14px;
        color: #0D1117;
        background: #fff;
        border: 1px solid rgba(13,17,23,0.14);
        border-radius: 8px;
        font-family: inherit;
        line-height: 1.5;
        transition: border-color .15s ease, box-shadow .15s ease;
        box-sizing: border-box;
      }
      .fb-textarea { resize: vertical; min-height: 110px; }
      .fb-input:focus, .fb-textarea:focus {
        outline: none;
        border-color: #0D1117;
        box-shadow: 0 0 0 3px rgba(13,17,23,0.08);
      }
      .fb-counter {
        position: absolute;
        right: 8px;
        bottom: 8px;
        font-size: 11px;
        color: rgba(13,17,23,0.38);
        pointer-events: none;
      }

      .fb-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      .fb-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 16px;
        border-radius: 8px;
        font-size: 13.5px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background .15s ease, color .15s ease, border-color .15s ease, transform .12s ease;
      }
      .fb-btn:active { transform: translateY(1px); }
      .fb-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .fb-btn-primary {
        background: #0D1117;
        color: #fff;
      }
      .fb-btn-primary:hover:not(:disabled) { background: #1B2028; }
      .fb-btn-ghost {
        background: transparent;
        color: rgba(13,17,23,0.62);
      }
      .fb-btn-ghost:hover { background: rgba(13,17,23,0.06); color: #0D1117; }
      .fb-btn-secondary {
        background: rgba(13,17,23,0.06);
        color: #0D1117;
      }
      .fb-btn-secondary:hover { background: rgba(13,17,23,0.10); }

      .fb-spinner {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.35);
        border-top-color: #fff;
        animation: fbSpin .7s linear infinite;
      }
      @keyframes fbSpin { to { transform: rotate(360deg); } }

      .fb-success {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        padding: 12px 0 4px;
      }
      .fb-success-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(40, 160, 90, 0.12);
        color: rgb(34, 130, 75);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .fb-success-title {
        font-size: 18px;
        font-weight: 600;
        color: #0D1117;
        margin: 0;
      }
      .fb-success-body {
        font-size: 14px;
        color: rgba(13,17,23,0.62);
        margin: 0 0 8px;
        max-width: 320px;
        line-height: 1.55;
      }
    `}</style>
  );
}

/**
 * @deprecated The original always-floating widget. Use FeedbackProvider plus
 * one of the trigger components instead. Kept exported only to avoid breaking
 * any forgotten import — calling it now just renders the provider so behavior
 * is graceful, but it should be removed in a follow-up cleanup.
 */
export function FeedbackWidget() {
  return <FeedbackProvider><></></FeedbackProvider>;
}

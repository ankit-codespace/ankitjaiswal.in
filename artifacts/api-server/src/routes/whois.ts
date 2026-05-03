import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { whoisDomain } from "whoiser";
import { logger } from "../lib/logger";

const router = Router();

const whoisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many lookups. Please try again in a minute." },
});

const querySchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Please enter a domain name.")
    .max(253, "Domain name is too long."),
});

const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE = 500;
type CacheEntry = { value: WhoisResult; ts: number };
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): WhoisResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function cacheSet(key: string, value: WhoisResult): void {
  cache.set(key, { value, ts: Date.now() });
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function normalizeDomain(input: string): string | null {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0]!.split("?")[0]!.split("#")[0]!.split(":")[0]!;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d)) return null;
  if (d.length < 3 || d.length > 253) return null;
  for (const label of d.split(".")) {
    if (label.length === 0 || label.length > 63) return null;
    if (label.startsWith("-") || label.endsWith("-")) return null;
  }
  return d;
}

const CREATED_KEYS = [
  "Created Date",
  "Creation Date",
  "Created On",
  "Created",
  "Registered",
  "Registered On",
  "Registration Date",
  "Domain Registration Date",
  "created",
  "registeredOn",
];
const UPDATED_KEYS = [
  "Updated Date",
  "Last Updated",
  "Last Modified",
  "Modified",
  "Last Update",
  "changed",
  "Updated",
];
const EXPIRES_KEYS = [
  "Expiry Date",
  "Expires Date",
  "Expiration Date",
  "Registry Expiry Date",
  "Registrar Registration Expiration Date",
  "paid-till",
  "Expires On",
  "Expires",
];
const REGISTRAR_KEYS = ["Registrar", "Sponsoring Registrar", "registrar"];
const STATUS_KEYS = ["Domain Status", "Status", "status"];
const NS_KEYS = ["Name Server", "Nameservers", "nserver", "Name Servers"];

function pickFirst(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] != null && obj[k] !== "") return obj[k];
    const lower = k.toLowerCase();
    for (const ok of Object.keys(obj)) {
      if (ok.toLowerCase() === lower && obj[ok] != null && obj[ok] !== "") {
        return obj[ok];
      }
    }
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0] as string;
  if (v instanceof Date) return v.toISOString();
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return undefined;
}

function parseDate(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

interface WhoisResult {
  domain: string;
  registrar?: string;
  createdDate?: string;
  updatedDate?: string;
  expiresDate?: string;
  ageYears?: number;
  ageDays?: number;
  daysUntilExpiry?: number;
  status?: string[];
  nameServers?: string[];
  source?: string;
  available?: boolean;
}

function flattenWhois(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const merged: Record<string, unknown> = {};
  // First level: whois server hostnames → parsed object (or string for raw)
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v != null && v !== "" && !(k in merged)) merged[k] = v;
      }
    }
  }
  return merged;
}

function detectAvailable(flat: Record<string, unknown>): boolean {
  // whoiser surfaces an explicit `text` array on no-match and may include
  // "available" hints. Also, an empty result with no created date is a strong
  // signal the domain is unregistered.
  const txt = flat["text"];
  if (Array.isArray(txt)) {
    const joined = txt.join("\n").toLowerCase();
    if (
      joined.includes("no match") ||
      joined.includes("not found") ||
      joined.includes("no entries found") ||
      joined.includes("status: free") ||
      joined.includes("status: available")
    ) {
      return true;
    }
  }
  const status = asStringArray(pickFirst(flat, STATUS_KEYS));
  if (status && status.some((s) => /free|available/i.test(s))) return true;
  return false;
}

router.get("/whois", whoisLimiter, async (req, res) => {
  let parsed;
  try {
    parsed = querySchema.parse(req.query);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.issues[0]?.message ?? "Invalid input." });
      return;
    }
    throw err;
  }

  const domain = normalizeDomain(parsed.domain);
  if (!domain) {
    res
      .status(400)
      .json({ message: "That doesn't look like a valid domain. Try something like example.com." });
    return;
  }

  const cached = cacheGet(domain);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    res.json(cached);
    return;
  }

  try {
    const raw = await whoisDomain(domain, { timeout: 7000, follow: 2 });
    const flat = flattenWhois(raw);

    if (Object.keys(flat).length === 0) {
      res.status(502).json({
        message:
          "Couldn't reach the WHOIS registry for that TLD. Try again, or try a different domain.",
      });
      return;
    }

    const available = detectAvailable(flat);

    if (available) {
      const result: WhoisResult = { domain, available: true };
      cacheSet(domain, result);
      res.setHeader("X-Cache", "MISS");
      res.json(result);
      return;
    }

    const createdDate = parseDate(pickFirst(flat, CREATED_KEYS));
    const updatedDate = parseDate(pickFirst(flat, UPDATED_KEYS));
    const expiresDate = parseDate(pickFirst(flat, EXPIRES_KEYS));
    const registrar = asString(pickFirst(flat, REGISTRAR_KEYS));
    const status = asStringArray(pickFirst(flat, STATUS_KEYS));
    const nameServers = asStringArray(pickFirst(flat, NS_KEYS))?.map((s) => s.toLowerCase());

    const now = Date.now();
    let ageYears: number | undefined;
    let ageDays: number | undefined;
    if (createdDate) {
      const ms = now - new Date(createdDate).getTime();
      if (ms > 0) {
        ageDays = Math.floor(ms / (1000 * 60 * 60 * 24));
        ageYears = Math.floor((ageDays / 365.25) * 100) / 100;
      }
    }

    let daysUntilExpiry: number | undefined;
    if (expiresDate) {
      const ms = new Date(expiresDate).getTime() - now;
      daysUntilExpiry = Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    const sourceServer = Object.keys(raw as Record<string, unknown>)[0];

    const result: WhoisResult = {
      domain,
      registrar,
      createdDate,
      updatedDate,
      expiresDate,
      ageYears,
      ageDays,
      daysUntilExpiry,
      status,
      nameServers,
      source: sourceServer,
      available: false,
    };

    cacheSet(domain, result);
    res.setHeader("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    logger.warn({ err, domain }, "whois lookup failed");
    res.status(502).json({
      message:
        "WHOIS lookup failed. Some TLDs rate-limit or temporarily reject queries — please try again in a moment.",
    });
  }
});

export default router;

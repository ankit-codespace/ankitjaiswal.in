import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Play, Pause, RotateCcw, SkipForward, Settings, Volume2, VolumeX,
  Bell, BellOff, Maximize2, Minimize2, Coffee, Brain, Check,
  Lock, Zap, Target, Activity, MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ToolPage, ToolSEOArticle, ToolSection, SectionHeading, ToolStatusBar,
  ToolFAQ, ToolHowToSteps, ToolFeatureGrid, ToolRelatedTools,
  ToolAuthorCard, ToolPrivacyBand, FeedbackInlineCard, buildToolJsonLd,
  tokens, type ToolFAQItem, type RelatedTool, type ToolHowToStep,
  type ToolFeature, type ToolStatusStat,
} from "@/components/tool";

/* ────────────────────────────────────────────────────────────────────────── */
/* SEO map                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

type PomoSeo = { title: string; description: string };

const CANONICAL = "/tools/pomodoro";

const SEO_MAP: Record<string, PomoSeo> = {
  "/tools/pomodoro": {
    title: "Pomodoro Timer Online — Free Focus Timer for Study & Work · Ankit Jaiswal",
    description:
      "Free, distraction-free Pomodoro timer that runs in your browser. 25-minute focus sessions, smart breaks, daily stats, and lifetime tracking. No signup, no ads, no upload.",
  },
  "/tools/pomodoro-timer": {
    title: "Pomodoro Timer Online — Free Productivity Timer · Ankit Jaiswal",
    description:
      "A clean, free online Pomodoro timer. 25/5 work-break cycles, customizable durations, sound + browser alerts, daily and lifetime stats. Privacy-first, runs entirely in your browser.",
  },
  "/tools/focus-timer": {
    title: "Focus Timer — Free Online Pomodoro for Deep Work · Ankit Jaiswal",
    description:
      "A focus timer built on the Pomodoro Technique. Block distractions, work in 25-minute sprints, take real breaks. Tracks your sessions locally — nothing uploaded.",
  },
  "/tools/study-timer": {
    title: "Study Timer Online — Free Pomodoro for Students · Ankit Jaiswal",
    description:
      "A free study timer using the Pomodoro Technique. Beat procrastination with 25-minute study sprints and 5-minute breaks. Track your daily focus time, no signup required.",
  },
  "/pomodoro": {
    title: "Pomodoro Timer Online — Free Focus Timer · Ankit Jaiswal",
    description:
      "Free, distraction-free Pomodoro timer. 25-minute focus sessions, smart breaks, daily and lifetime stats. No signup, no ads.",
  },
};

const DEFAULT_SEO = SEO_MAP[CANONICAL]!;

/* ────────────────────────────────────────────────────────────────────────── */
/* Types & storage                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

type Phase = "work" | "short" | "long";

interface Settings {
  workMin: number;
  shortMin: number;
  longMin: number;
  longBreakAfter: number;
  sound: boolean;
  notifications: boolean;
  autoStartBreak: boolean;
  autoStartWork: boolean;
}

interface Stats {
  date: string; // YYYY-MM-DD
  todayFocusMs: number;
  todaySessions: number;
  lifetimeFocusMs: number;
  lifetimeSessions: number;
  /** Rolling 30-day history keyed by YYYY-MM-DD with focus milliseconds. */
  history: Record<string, number>;
}

const SETTINGS_KEY = "ankit:pomodoro:settings:v1";
const STATS_KEY = "ankit:pomodoro:stats:v1";

const DEFAULT_SETTINGS: Settings = {
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  longBreakAfter: 4,
  sound: true,
  notifications: false,
  autoStartBreak: true,
  autoStartWork: false,
};

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

/** Roll today's bucket into history if `prev.date` is no longer today.
 *  Pure function — safe to call from setState reducers AND from loadStats.
 *  Critical for the cross-midnight bug: previously this only ran on
 *  loadStats(), so a session that completed after midnight added to
 *  yesterday's bucket *and* yesterday never got archived. */
function rolloverIfNeeded(prev: Stats): Stats {
  const today = todayKey();
  if (prev.date === today) return prev;
  const history = { ...(prev.history || {}) };
  if (prev.date && prev.todayFocusMs > 0) {
    // Merge in case history already has an entry for that day (multi-tab).
    history[prev.date] = (history[prev.date] || 0) + prev.todayFocusMs;
  }
  // Trim to last 30 entries (sorted by date string is sorted by date).
  const keys = Object.keys(history).sort().slice(-30);
  const trimmed: Record<string, number> = {};
  for (const k of keys) trimmed[k] = history[k]!;
  return {
    ...prev,
    date: today,
    todayFocusMs: 0,
    todaySessions: 0,
    history: trimmed,
  };
}

function loadStats(): Stats {
  const empty: Stats = {
    date: todayKey(),
    todayFocusMs: 0,
    todaySessions: 0,
    lifetimeFocusMs: 0,
    lifetimeSessions: 0,
    history: {},
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Stats;
    // Defensive merge with empty so any missing fields (older shape) get defaults.
    const merged: Stats = { ...empty, ...parsed, history: parsed.history || {} };
    return rolloverIfNeeded(merged);
  } catch {
    return empty;
  }
}

function saveStats(s: Stats): void {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

function fmtMMSS(totalMs: number): string {
  const total = Math.max(0, Math.ceil(totalMs / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtFocusTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function thirtyDayAvg(stats: Stats): number {
  const vals = Object.values(stats.history);
  // Include today as an entry so the average isn't artificially low on day 1.
  const todayMs = stats.todayFocusMs;
  const all = [...vals, todayMs].filter((v) => v > 0);
  if (all.length === 0) return 0;
  return all.reduce((a, b) => a + b, 0) / all.length;
}

/** Largest single-day focus, including today. */
function bestDayMs(stats: Stats): number {
  const vals = Object.values(stats.history);
  const all = [...vals, stats.todayFocusMs];
  return all.reduce((max, v) => (v > max ? v : max), 0);
}

/** Lifetime focus divided by lifetime session count — average length per pomodoro. */
function avgSessionMs(stats: Stats): number {
  if (stats.lifetimeSessions <= 0) return 0;
  return stats.lifetimeFocusMs / stats.lifetimeSessions;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Component                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export default function Pomodoro() {
  const [location] = useLocation();
  const seo = SEO_MAP[location] ?? DEFAULT_SEO;
  const mainRef = useRef<HTMLElement | null>(null);

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState<Stats>(loadStats);

  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  /** Wall-clock timestamp (ms) when this segment will end. */
  const [endAt, setEndAt] = useState<number | null>(null);
  /** When paused, holds the remaining ms in the segment. */
  const [pausedRemainMs, setPausedRemainMs] = useState<number | null>(null);
  /** Tick state — only used to force re-render once per second. */
  const [, setTick] = useState(0);
  /** How many work pomodoros completed since the last long break (0..longBreakAfter). */
  const [cyclePos, setCyclePos] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  /** The exact duration (ms) of the in-flight work segment.
   *  Captured at startSegment("work") time so completion credits the
   *  ACTUAL duration that ran — not whatever workMin happens to be at
   *  completion time (in case the user changed it via Settings mid-session). */
  const currentWorkDurMsRef = useRef<number | null>(null);

  // Persist settings & stats whenever they change
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveStats(stats); }, [stats]);

  // Tick once per 250ms while running for a smooth countdown
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [running, paused]);

  /* ────── Derived: duration & remaining ────── */
  const phaseDurationMs = useMemo(() => {
    const map: Record<Phase, number> = {
      work: settings.workMin * 60_000,
      short: settings.shortMin * 60_000,
      long: settings.longMin * 60_000,
    };
    return map[phase];
  }, [phase, settings.workMin, settings.shortMin, settings.longMin]);

  // Intentionally NOT memoized: this needs to recompute against Date.now()
  // every tick. A useMemo here would cache the first value and freeze the
  // countdown display, since none of the obvious deps change between ticks
  // and Date.now() can't be a dep. The 250ms interval above forces the
  // re-render; this expression then reads the live wall clock.
  const remainingMs = (() => {
    if (paused && pausedRemainMs != null) return pausedRemainMs;
    if (running && endAt != null) return Math.max(0, endAt - Date.now());
    return phaseDurationMs;
  })();

  const progress = phaseDurationMs > 0 ? 1 - remainingMs / phaseDurationMs : 0;

  /* Live elapsed time within the in-flight WORK segment.
     Shown additively on the stat tiles so users see their progress
     accumulate in real time (Toggl / Things 3 / Apple Fitness pattern)
     instead of frozen until the segment completes.
     Sessions-today intentionally is NOT incremented — it counts
     completed sessions only. */
  const elapsedThisSessionMs = (() => {
    if (phase !== "work") return 0;
    if (paused && pausedRemainMs != null) {
      return Math.max(0, phaseDurationMs - pausedRemainMs);
    }
    if (running && endAt != null) {
      return Math.max(0, phaseDurationMs - Math.max(0, endAt - Date.now()));
    }
    return 0;
  })();
  const liveStats: Stats = elapsedThisSessionMs > 0
    ? {
        ...stats,
        todayFocusMs: stats.todayFocusMs + elapsedThisSessionMs,
        lifetimeFocusMs: stats.lifetimeFocusMs + elapsedThisSessionMs,
      }
    : stats;

  /* ────── Document title reflects countdown ────── */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const original = document.title;
    if (running) {
      const label = phase === "work" ? "Focus" : phase === "short" ? "Break" : "Long break";
      document.title = `${fmtMMSS(remainingMs)} · ${label} — Pomodoro`;
    }
    return () => { document.title = original; };
  }, [running, phase, remainingMs]);

  /* ────── Session-completion handler ────── */
  const completeSegmentRef = useRef<() => void>(() => {});

  // Preload chimes once so the first completion isn't laggy.
  const chimeRefs = useRef<{ start?: HTMLAudioElement; end?: HTMLAudioElement }>({});
  useEffect(() => {
    if (typeof Audio === "undefined") return;
    try {
      const start = new Audio("/sounds/break-starts.mp3"); start.preload = "auto"; start.volume = 0.55;
      const end = new Audio("/sounds/break-ends.mp3"); end.preload = "auto"; end.volume = 0.55;
      chimeRefs.current = { start, end };
    } catch { /* noop */ }
  }, []);

  const playChime = useCallback((kind: "start" | "end") => {
    if (!settings.sound) return;
    const a = chimeRefs.current[kind];
    if (!a) return;
    try {
      a.currentTime = 0;
      void a.play().catch(() => { /* autoplay blocked — silently ignore */ });
    } catch { /* noop */ }
    // Subtle haptic feedback on phones that support it.
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(kind === "end" ? [40, 50, 40] : 60); } catch { /* noop */ }
    }
  }, [settings.sound]);

  const notify = useCallback((title: string, body: string) => {
    if (!settings.notifications) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body, silent: true });
    } catch { /* noop */ }
  }, [settings.notifications]);

  const startSegment = useCallback((p: Phase) => {
    const dur =
      p === "work" ? settings.workMin * 60_000 :
      p === "short" ? settings.shortMin * 60_000 :
      settings.longMin * 60_000;
    if (p === "work") currentWorkDurMsRef.current = dur;
    setPhase(p);
    setEndAt(Date.now() + dur);
    setPausedRemainMs(null);
    setPaused(false);
    setRunning(true);
  }, [settings.workMin, settings.shortMin, settings.longMin]);

  completeSegmentRef.current = () => {
    // Update stats on completed *work* segments
    if (phase === "work") {
      // Credit the duration that ACTUALLY ran (set at startSegment), not
      // the current setting — protects against mid-session changes.
      const credited = currentWorkDurMsRef.current ?? settings.workMin * 60_000;
      currentWorkDurMsRef.current = null;
      setStats((prev) => {
        // Roll over inside the reducer so a session completing past
        // midnight archives yesterday's bucket cleanly before adding to today.
        const rolled = rolloverIfNeeded(prev);
        return {
          ...rolled,
          todayFocusMs: rolled.todayFocusMs + credited,
          todaySessions: rolled.todaySessions + 1,
          lifetimeFocusMs: rolled.lifetimeFocusMs + credited,
          lifetimeSessions: rolled.lifetimeSessions + 1,
        };
      });
      const nextPos = cyclePos + 1;
      const isLong = nextPos >= settings.longBreakAfter;
      setCyclePos(isLong ? 0 : nextPos);

      playChime("end");
      const nextPhase: Phase = isLong ? "long" : "short";
      notify("Focus session complete", isLong
        ? `Nice. Take a longer ${settings.longMin}-minute break.`
        : `Take a ${settings.shortMin}-minute break.`);

      if (settings.autoStartBreak) {
        startSegment(nextPhase);
      } else {
        setRunning(false);
        setPhase(nextPhase);
        setEndAt(null);
        setPausedRemainMs(null);
      }
    } else {
      // Break ended
      playChime("start");
      notify("Break's over", "Ready for another focus session?");
      if (settings.autoStartWork) {
        startSegment("work");
      } else {
        setRunning(false);
        setPhase("work");
        setEndAt(null);
        setPausedRemainMs(null);
      }
    }
  };

  // Watch for segment completion via the tick (cheaper than nesting timeouts and
  // resilient to system-sleep / tab-throttling drift, because we anchor to a
  // wall-clock endAt).
  useEffect(() => {
    if (!running || paused || endAt == null) return;
    if (Date.now() >= endAt) {
      completeSegmentRef.current();
    }
  });

  /* ────── Controls ────── */
  const handleStart = useCallback(() => {
    if (paused && pausedRemainMs != null) {
      setEndAt(Date.now() + pausedRemainMs);
      setPausedRemainMs(null);
      setPaused(false);
      setRunning(true);
      return;
    }
    startSegment(phase);
  }, [paused, pausedRemainMs, phase, startSegment]);

  const handlePause = useCallback(() => {
    if (!running || paused || endAt == null) return;
    setPausedRemainMs(Math.max(0, endAt - Date.now()));
    setPaused(true);
  }, [running, paused, endAt]);

  const handleReset = useCallback(() => {
    setRunning(false);
    setPaused(false);
    setEndAt(null);
    setPausedRemainMs(null);
    setPhase("work");
    setCyclePos(0);
  }, []);

  const handleSkip = useCallback(() => {
    // Move to next phase WITHOUT crediting a partial session.
    if (phase === "work") {
      const isLong = cyclePos + 1 >= settings.longBreakAfter;
      setCyclePos(isLong ? 0 : cyclePos + 1);
      const next: Phase = isLong ? "long" : "short";
      if (settings.autoStartBreak) startSegment(next);
      else { setRunning(false); setPhase(next); setEndAt(null); setPausedRemainMs(null); }
    } else {
      if (settings.autoStartWork) startSegment("work");
      else { setRunning(false); setPhase("work"); setEndAt(null); setPausedRemainMs(null); }
    }
  }, [phase, cyclePos, settings.longBreakAfter, settings.autoStartBreak, settings.autoStartWork, startSegment]);

  const setWorkPreset = useCallback((min: number) => {
    setSettings((s) => ({ ...s, workMin: min }));
    if (phase === "work" && !running) {
      // refresh display to new duration
      setEndAt(null);
      setPausedRemainMs(null);
    }
  }, [phase, running]);

  const requestNotifPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch { return false; }
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!settings.notifications) {
      const ok = await requestNotifPermission();
      setSettings((s) => ({ ...s, notifications: ok }));
    } else {
      setSettings((s) => ({ ...s, notifications: false }));
    }
  }, [settings.notifications, requestNotifPermission]);

  /* ────── ESC closes settings & focus mode ────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (focusMode) setFocusMode(false);
        else if (showSettings) setShowSettings(false);
        else if (showOverflow) setShowOverflow(false);
      }
      // Spacebar starts/pauses when not focused on input
      if (e.code === "Space") {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        if (running && !paused) handlePause();
        else handleStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, showSettings, showOverflow, running, paused, handlePause, handleStart]);

  /* ────── Day-rollover safety: also runs on tab focus & every minute,
     so a user who keeps the tab open across midnight without finishing
     a session still sees today reset cleanly. */
  useEffect(() => {
    const check = () => setStats((prev) => rolloverIfNeeded(prev));
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(check, 60_000);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, []);

  /* ────── Click-outside closes overflow menu ────── */
  useEffect(() => {
    if (!showOverflow) return;
    const onDown = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [showOverflow]);

  /* ────────── Render-side derived ────────── */
  const phaseLabel = phase === "work" ? "Focus" : phase === "short" ? "Short break" : "Long break";
  const phaseHint = !running
    ? phase === "work" ? "Ready to focus" : phase === "short" ? "Ready for a short break" : "Ready for a long break"
    : paused ? "Paused" : phaseLabel;
  const ringR = 125;
  const ringC = 2 * Math.PI * ringR;
  const dashOffset = ringC * (1 - progress);

  /* ────────────────────── SEO content (memoized) ────────────────────── */
  const faqs: ToolFAQItem[] = useMemo(() => [
    {
      q: "What is the Pomodoro Technique?",
      a: "The Pomodoro Technique is a time-management method created by Francesco Cirillo in the late 1980s. You work in focused 25-minute intervals (called pomodoros), take a 5-minute break after each one, and a longer 15–30 minute break after every fourth pomodoro. The structure exploits how human attention naturally cycles: you get more done because you stop pretending you can focus indefinitely.",
    },
    {
      q: "Is this Pomodoro timer really free?",
      a: "Yes. No signup, no login, no email collection, no ads, no upsells, no premium tier. The timer, stats, sound alerts, and browser notifications are all in the free tier — because there isn't a paid tier. It's part of a privacy-first toolkit hosted on my personal site.",
    },
    {
      q: "Where is my data stored?",
      a: "Entirely in your browser's localStorage. Daily focus minutes, lifetime hours, settings, and recent history never leave your device. There's no account, no server-side database, no analytics tied to your identity. Clear your browser data and everything resets to zero.",
    },
    {
      q: "Why 25 minutes? Can I change the duration?",
      a: "25 minutes is the canonical Pomodoro duration — long enough to make real progress, short enough that your brain doesn't fatigue. But people work differently: deep coding may want 45–60 minute blocks, quick admin tasks may suit 15. Use the preset chips (25 / 30 / 45 / 60) or type a custom duration up to 120 minutes.",
    },
    {
      q: "Does it work when I switch tabs or my screen sleeps?",
      a: "Yes. The timer is anchored to a real wall-clock end time, not a counter that decrements while the tab is active. When you come back, it knows exactly how much time has actually passed — even if your screen slept, the browser throttled the tab, or you switched to another app for ten minutes.",
    },
    {
      q: "Will it notify me when a session ends?",
      a: "Two ways. Sound alerts play a short chime when a focus session completes and another when a break ends — these work even in muted-tab autoplay environments because the browser counts your earlier interaction with the Start button as user gesture. Browser notifications are opt-in: enable them in settings and we'll request permission once.",
    },
    {
      q: "Why does the daily stats reset at midnight?",
      a: "'Today' is calculated from your local device timezone. At midnight your time, today's focus minutes archive into the 30-day rolling history (used for the average) and the today counter resets. Lifetime hours never reset.",
    },
    {
      q: "What's the difference between auto-start break and auto-start work?",
      a: "Auto-start break is on by default — when a focus session ends, your break begins immediately so you actually take it instead of muscle-memorying through to another work session. Auto-start work is off by default, because most people use the end of break as a natural moment to decide what to focus on next. You can flip both in settings.",
    },
    {
      q: "Does the Pomodoro Technique actually work?",
      a: "There's surprisingly little RCT-grade research on it specifically, but the principles it bundles — time-boxing, scheduled rest, single-tasking, and visible progress — are individually well supported by attention-restoration research and time-on-task literature. In practice, the people who get the most out of it are ones who treat the timer as a commitment device for not multitasking, not as a metronome to perform productivity for.",
    },
    {
      q: "Can I use this for studying?",
      a: "Yes — the Pomodoro Technique is one of the most widely-recommended methods for students, especially for long study sessions where attention degrades over time. Use 25-minute work blocks for active recall and reading, 5-minute breaks to walk away from the screen, and a long break after four pomodoros for genuine recovery. The daily focus stat lets you see how much real study time you logged, which is a more honest metric than 'hours at the desk'.",
    },
    {
      q: "I closed the tab mid-session. Did I lose my progress?",
      a: "If a focus session was running when you closed the tab, that session isn't credited (because the timer needs a clean completion to count). Your historical stats — daily totals, lifetime hours — are saved continuously and will be exactly as you left them.",
    },
    {
      q: "Was this on a different domain before?",
      a: "Yes. An earlier version lived at pomodorotrack.com. I've consolidated all my tools onto this single site so the toolkit feels like one product instead of a graveyard of micro-domains, and so I can ship improvements once instead of three times.",
    },
  ], []);

  const features: ToolFeature[] = useMemo(() => [
    {
      icon: Brain,
      title: "Drift-proof timer",
      desc: "The countdown is anchored to a real end time, so leaving the tab, locking your screen, or sleeping your laptop doesn't add fake seconds. You come back to the right number.",
    },
    {
      icon: Activity,
      title: "Honest local stats",
      desc: "Today's focus minutes, sessions, 30-day rolling average, and lifetime hours — calculated from completed sessions only and stored entirely in your browser.",
    },
    {
      icon: Lock,
      title: "Zero accounts, zero uploads",
      desc: "No login, no email, no telemetry tied to you. The whole thing runs locally and your stats survive refresh through your browser's own storage.",
    },
    {
      icon: Bell,
      title: "Sound + browser alerts",
      desc: "Optional sound chime when a focus session ends. Optional opt-in browser notifications so you don't miss the end of a break when you've buried this tab.",
    },
    {
      icon: Target,
      title: "Custom durations",
      desc: "25/30/45/60-minute preset chips, plus a custom input up to 120 minutes. Change short and long break lengths from settings.",
    },
    {
      icon: Zap,
      title: "Distraction-free mode",
      desc: "One click hides everything except the countdown. Useful for projector/streaming setups or when even the stats feel like a distraction.",
    },
  ], []);

  const howTo: ToolHowToStep[] = useMemo(() => [
    {
      title: "Pick your work duration",
      body: "Use a preset (25/30/45/60) or type a custom number. 25 minutes is the canonical Pomodoro length and a good place to start if you've never done this.",
    },
    {
      title: "Hit Start (or press space)",
      body: "The ring fills as time elapses. The page title shows the countdown so you can monitor it from a different tab. Pause and resume anytime.",
    },
    {
      title: "Take the break when it tells you to",
      body: "After each focus session, a short break begins (auto-started by default). Stand up, look out a window, drink water — anything but more screen.",
    },
    {
      title: "Long break after four pomodoros",
      body: "Every fourth completed focus session triggers a longer break (15 minutes by default). Your daily focus and lifetime hours are tracked locally as you go.",
    },
  ], []);

  const related: RelatedTool[] = useMemo(() => [
    {
      href: "/online-notepad",
      name: "Online Notepad",
      desc: "Distraction-free writing surface with autosave and Markdown export.",
    },
    {
      href: "/tools/clipboard-history",
      name: "Clipboard History",
      desc: "Save, search and reuse text snippets across all your work sessions.",
    },
    {
      href: "/tools/paste-to-image",
      name: "Paste to Image",
      desc: "Paste a screenshot, annotate or blur it, and download as PNG — entirely in-browser.",
    },
    {
      href: "/tools/youtube-summary",
      name: "YouTube Summary",
      desc: "Turn any YouTube transcript into a focused summary in your favorite AI.",
    },
  ], []);

  const jsonLd = useMemo(
    () => buildToolJsonLd({
      name: "Pomodoro Timer",
      description: seo.description,
      path: location,
      breadcrumbName: "Pomodoro Timer",
      faqs,
    }),
    [seo, location, faqs],
  );

  /* ────────────────────── Render ────────────────────── */
  return (
    <ToolPage
      seoTitle={seo.title}
      seoDescription={seo.description}
      seoPath={CANONICAL}
      seoJsonLd={jsonLd}
      title="Pomodoro Timer"
      tagline="Focus in 25-minute sprints — privacy-first, in your browser"
      backHref="/tools"
      backLabel="Tools"
    >
      <main className="pm-stage" ref={mainRef}>
        <div className="pm-grid">
          {/* ── Timer card ── */}
          <section className="pm-card pm-timer-card" aria-label="Pomodoro timer">
            <div
              className="pm-progress-dots"
              role="group"
              aria-label={`Cycle progress: ${cyclePos} of ${settings.longBreakAfter} pomodoros, current phase ${phaseLabel}`}
            >
              {Array.from({ length: settings.longBreakAfter }).map((_, i) => {
                const total = settings.longBreakAfter;
                const isLast = i === total - 1;
                const status =
                  i < cyclePos ? "complete"
                  : i === cyclePos ? "current"
                  : "up next";
                const tip = isLast
                  ? `Pomodoro ${i + 1} of ${total} — ${status}. Long break (${settings.longMin} min) after this one.`
                  : `Pomodoro ${i + 1} of ${total} — ${status}. Short break (${settings.shortMin} min) after.`;
                return (
                  <span
                    key={i}
                    className={`pm-dot ${i < cyclePos ? "pm-dot-on" : ""}`}
                    title={tip}
                    aria-label={tip}
                  />
                );
              })}
            </div>

            <div className="pm-ring-wrap">
              <svg className="pm-ring" viewBox="0 0 260 260" aria-hidden="true">
                <circle cx="130" cy="130" r={ringR} className="pm-ring-bg" />
                <circle
                  cx="130"
                  cy="130"
                  r={ringR}
                  className={`pm-ring-fg pm-ring-fg-${phase}`}
                  strokeDasharray={ringC}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="pm-ring-inner">
                <div className="pm-time" aria-live="polite">{fmtMMSS(remainingMs)}</div>
                <div className="pm-status">{phaseHint}</div>
              </div>
            </div>

            {/* Duration row: only shown when idle. Once a session starts,
                mid-session duration changes don't make sense and the row
                just adds visual noise — so we hide it entirely (Apple
                Clock Timer pattern) instead of disabling. */}
            {!running && (
              <div className="pm-presets-row">
                {/* Segmented control — one container, text-only items.
                    Active state is just green text + a 3px green dot
                    underneath. Same pattern as iOS Segmented Control
                    and Apple Music's filter row. */}
                <div className="pm-presets" role="group" aria-label="Work duration presets">
                  {[25, 30, 45, 60].map((v) => {
                    const active = settings.workMin === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        className={`pm-preset ${active ? "pm-preset-on" : ""}`}
                        onClick={() => setWorkPreset(v)}
                        aria-pressed={active}
                      >
                        {v} min
                        <span className="pm-preset-dot" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
                {/* Custom sits outside the segmented pill — different
                    mental category (arbitrary vs. preset). */}
                <div className="pm-custom">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    placeholder="Custom"
                    value={[25, 30, 45, 60].includes(settings.workMin) ? "" : settings.workMin}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 1 && v <= 120) setWorkPreset(v);
                    }}
                    aria-label="Custom work duration in minutes"
                  />
                  <span>min</span>
                </div>
              </div>
            )}

            {/* Hero controls row. The discipline borrowed from Apple
                Clock Timer / Things 3 / Linear: at any moment, the user
                should know exactly what their next click is. So we show
                only Pause+Skip while running, or Start while idle —
                centered, hero-weight. Everything else moves into the
                overflow menu (top-right of card). */}
            <div className="pm-controls" role="group" aria-label="Timer controls">
              {!running || paused ? (
                <button type="button" className="pm-btn pm-btn-primary" onClick={handleStart}>
                  <Play size={14} fill="currentColor" />
                  {paused ? "Resume" : phase === "work" ? "Start focus" : `Start ${phase === "short" ? "short" : "long"} break`}
                </button>
              ) : (
                <>
                  <button type="button" className="pm-btn pm-btn-primary" onClick={handlePause}>
                    <Pause size={14} fill="currentColor" /> Pause
                  </button>
                  <button
                    type="button"
                    className="pm-btn pm-btn-ghost"
                    onClick={handleSkip}
                    aria-label="Skip to next segment"
                    title="Skip to next segment"
                  >
                    <SkipForward size={14} /> Skip
                  </button>
                </>
              )}
            </div>

            {/* Overflow menu — top-right corner of card. Same convention
                Linear, Notion, Things 3 use for "everything else": one
                discoverable affordance, never competes with the hero. */}
            <div className="pm-overflow" ref={overflowRef}>
              <button
                type="button"
                className="pm-icon-btn pm-overflow-trigger"
                onClick={() => setShowOverflow((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showOverflow}
                aria-label="More options"
                title="More options"
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {showOverflow && (
                  <motion.div
                    role="menu"
                    className="pm-overflow-menu"
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                  >
                    <button
                      type="button" role="menuitem" className="pm-menu-item"
                      onClick={() => { setFocusMode(true); setShowOverflow(false); }}
                    >
                      <Maximize2 size={14} />
                      <span>Distraction-free mode</span>
                    </button>
                    <button
                      type="button" role="menuitemcheckbox" aria-checked={settings.sound}
                      className="pm-menu-item"
                      onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
                    >
                      {settings.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      <span>Sound</span>
                      <span className="pm-menu-state">{settings.sound ? "On" : "Off"}</span>
                    </button>
                    <button
                      type="button" role="menuitemcheckbox" aria-checked={settings.notifications}
                      className="pm-menu-item"
                      onClick={() => void toggleNotifications()}
                    >
                      {settings.notifications ? <Bell size={14} /> : <BellOff size={14} />}
                      <span>Notifications</span>
                      <span className="pm-menu-state">{settings.notifications ? "On" : "Off"}</span>
                    </button>
                    <div className="pm-menu-divider" role="separator" />
                    <button
                      type="button" role="menuitem" className="pm-menu-item"
                      onClick={() => { handleReset(); setShowOverflow(false); }}
                      disabled={!running && cyclePos === 0 && remainingMs === phaseDurationMs}
                    >
                      <RotateCcw size={14} />
                      <span>Reset timer</span>
                    </button>
                    <button
                      type="button" role="menuitem" className="pm-menu-item"
                      onClick={() => { setShowSettings(true); setShowOverflow(false); }}
                    >
                      <Settings size={14} />
                      <span>Timer settings…</span>
                    </button>
                    <div className="pm-menu-divider" role="separator" />
                    <div className="pm-menu-hint">
                      <kbd>Space</kbd> start / pause
                    </div>
                    <div className="pm-menu-hint">
                      <kbd>Esc</kbd> exit focus mode
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* ── Stats card ── */}
          <aside className="pm-card pm-stats-card" aria-label="Your stats today">
            <div className="pm-stats-head">
              <Activity size={13} />
              <span>Your progress</span>
            </div>
            <div className="pm-stats-grid">
              <Stat value={fmtFocusTime(liveStats.todayFocusMs)} label="Focus today" />
              <Stat value={String(stats.todaySessions)} label="Sessions today" />
              <Stat value={fmtFocusTime(thirtyDayAvg(liveStats))} label="30-day avg" />
              <Stat value={fmtFocusTime(bestDayMs(liveStats))} label="Best day" />
              <Stat value={fmtFocusTime(avgSessionMs(stats))} label="Avg session" />
              <Stat value={fmtFocusTime(liveStats.lifetimeFocusMs)} label="Lifetime" />
            </div>
            <p className="pm-stats-foot">
              Stored only in your browser. No account, no upload.
            </p>
          </aside>
        </div>
      </main>

      {/* Settings popover */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              key="ov"
              className="pm-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              key="popover"
              className="pm-popover"
              role="dialog" aria-modal="true" aria-labelledby="pm-settings-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <div className="pm-popover-head">
                <h3 id="pm-settings-title">Settings</h3>
                <button type="button" className="pm-icon-btn" onClick={() => setShowSettings(false)} aria-label="Close">
                  <Check size={15} />
                </button>
              </div>
              <Toggle
                label="Sound alerts"
                desc="Chime when focus and break end."
                value={settings.sound}
                onChange={(v) => setSettings((s) => ({ ...s, sound: v }))}
              />
              <Toggle
                label="Browser notifications"
                desc="Show a system notification on segment end."
                value={settings.notifications}
                onChange={() => void toggleNotifications()}
              />
              <Toggle
                label="Auto-start breaks"
                desc="Move into break automatically when focus ends."
                value={settings.autoStartBreak}
                onChange={(v) => setSettings((s) => ({ ...s, autoStartBreak: v }))}
              />
              <Toggle
                label="Auto-start work"
                desc="Move into next focus block when a break ends."
                value={settings.autoStartWork}
                onChange={(v) => setSettings((s) => ({ ...s, autoStartWork: v }))}
              />
              <div className="pm-numgrid">
                <NumField
                  label="Short break"
                  value={settings.shortMin}
                  min={1} max={30}
                  onChange={(v) => setSettings((s) => ({ ...s, shortMin: v }))}
                />
                <NumField
                  label="Long break"
                  value={settings.longMin}
                  min={5} max={60}
                  onChange={(v) => setSettings((s) => ({ ...s, longMin: v }))}
                />
                <NumField
                  label="Long break after"
                  value={settings.longBreakAfter}
                  min={2} max={8}
                  onChange={(v) => setSettings((s) => ({ ...s, longBreakAfter: v }))}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Distraction-free overlay */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            key="focus"
            className="pm-focus"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label="Distraction-free timer"
          >
            <button
              type="button"
              className="pm-focus-exit"
              onClick={() => setFocusMode(false)}
              aria-label="Exit focus mode (Esc)"
              title="Exit focus mode (Esc)"
            >
              <Minimize2 size={14} />
            </button>
            <div className="pm-focus-time">{fmtMMSS(remainingMs)}</div>
            <div className="pm-focus-label">{phaseHint}</div>
            <div className="pm-focus-hint" aria-hidden="true">Press <kbd>Esc</kbd> to exit</div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToolSEOArticle
        h1="Free Pomodoro Timer Online — Focus Timer for Study & Work"
        intro={`A clean, fast Pomodoro timer that runs entirely in your browser. ${settings.workMin}-minute focus sessions, smart breaks, and honest local stats — no signup, no upload, no ads. Whether you're studying, writing, coding, or just trying to do one thing at a time, the structure keeps you honest about how much you actually focused today.`}
      >
        <ToolSection>
          <SectionHeading kicker="Features" title="Why use this Pomodoro timer" />
          <ToolFeatureGrid items={features} />
        </ToolSection>

        <ToolSection>
          <SectionHeading kicker="How to" title="How to use the Pomodoro timer in four steps" />
          <ToolHowToSteps steps={howTo} />
        </ToolSection>

        <ToolSection>
          <SectionHeading
            kicker="The technique"
            title="What is the Pomodoro Technique, and why does it work?"
          />
          <p className="tool-prose">
            The Pomodoro Technique was invented in the late 1980s by an Italian university student named Francesco Cirillo, who used a tomato-shaped kitchen timer (<em>pomodoro</em> is Italian for tomato) to commit to studying in fixed 25-minute sprints. The whole method is three rules:
          </p>
          <ul className="tool-prose tool-list">
            <li><strong>One task at a time</strong> for one 25-minute pomodoro. Multitasking forfeits the round.</li>
            <li><strong>A 5-minute break</strong> after each pomodoro — get away from the screen, not just away from the task.</li>
            <li><strong>A longer break</strong> (15–30 minutes) after every fourth pomodoro to genuinely recover.</li>
          </ul>
          <p className="tool-prose">
            What's actually happening is a stack of well-supported productivity primitives: time-boxing forces a finite commitment, the timer turns "focus" from an aspiration into a measurable thing, and the scheduled break short-circuits the build-up of decision fatigue. The technique doesn't make you smarter — it stops you from spending the day half-focused on six things at once.
          </p>
        </ToolSection>

        <ToolSection>
          <SectionHeading
            kicker="Who it's for"
            title="Students, writers, developers, and the chronically distracted"
          />
          <div className="tool-prose">
            <p>
              The Pomodoro Technique is one of the most-recommended study methods for college and competitive-exam students, because long study sessions degrade gracefully when broken into 25-minute sprints with active recall in each block. It's also a staple in deep-work circles — programmers, writers, researchers — where the hardest part is sitting down and starting at all. The timer becomes a commitment device: <em>I just need to do 25 minutes.</em>
            </p>
            <p>
              For knowledge workers in jobs that don't have visible "output" (reading, thinking, drafting), the daily focus stat is the single most useful number on this page. It tells you, honestly, how much real concentrated work you logged — separate from how busy you felt or how many meetings ate the day.
            </p>
          </div>
        </ToolSection>

        <ToolSection>
          <SectionHeading
            kicker="Common pitfalls"
            title="What goes wrong, and how to fix it"
          />
          <div className="tool-prose">
            <p><strong>You skip the break.</strong> The break isn't optional. The whole point is that mental recovery happens during it. Working through the break gets you a 25-minute session followed by a degraded second one, not two productive sessions. Walk away.</p>
            <p><strong>You answer "just one Slack message" mid-session.</strong> The pomodoro is over the moment you context-switch. You can absolutely choose to honor that — but be honest about it. Reset and start again.</p>
            <p><strong>You pick a task too big for one pomodoro.</strong> "Write the launch post" is not a pomodoro task. "Outline the first three sections of the launch post" is. If you can't finish a chunk in one session, slice it smaller before you start the timer.</p>
            <p><strong>You use it for tasks that don't need it.</strong> Fast email triage, quick admin, a five-minute call — these are not pomodoro tasks. The technique is for sustained attention. Use it where attention is the limiting factor, not where it isn't.</p>
          </div>
        </ToolSection>

        <ToolPrivacyBand
          heading="Your stats stay on your device"
          body="No account, no email, no upload. Daily focus minutes, lifetime hours, and settings live in your browser's localStorage and never travel anywhere. Clear your browser data and the slate is clean."
        />

        <ToolSection>
          <SectionHeading kicker="FAQ" title="Frequently asked questions" />
          <ToolFAQ items={faqs} />
        </ToolSection>

        <FeedbackInlineCard />

        <ToolSection>
          <SectionHeading kicker="Other useful tools" title="More from the toolbox" />
          <ToolRelatedTools items={related} />
        </ToolSection>

        <ToolAuthorCard />
      </ToolSEOArticle>

      <PomodoroStyles />

      {/* Footer is purposely thin — the sidebar already shows today/sessions
          above the fold, and the giant digits already show time remaining
          when the timer is on screen. The footer earns its place only when
          the user scrolls into the SEO article below; at that point its
          single job is "is a session still running, and how long left?". */}
      <ToolStatusBar
        stats={[
          { key: "phase", label: running ? `${phaseLabel}${paused ? " · paused" : ""}` : "Ready", accent: running && !paused ? undefined : "muted" },
          { key: "rem", label: `${fmtMMSS(remainingMs)} left`, accent: running && !paused ? undefined : "muted" },
        ]}
        hideBelowRef={mainRef}
      />
    </ToolPage>
  );
}

/* ────────────────────── Subcomponents ────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="pm-stat">
      <div className="pm-stat-value">{value}</div>
      <div className="pm-stat-label">{label}</div>
    </div>
  );
}

function Toggle({
  label, desc, value, onChange,
}: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="pm-row">
      <div>
        <div className="pm-row-label">{label}</div>
        <div className="pm-row-desc">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`pm-switch ${value ? "pm-switch-on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="pm-switch-thumb" />
      </button>
    </div>
  );
}

function NumField({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="pm-num">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
        }}
      />
    </label>
  );
}

/* ────────────────────── Styles ────────────────────── */

function PomodoroStyles() {
  return (
    <style>{`
      /* Stage breathes from the top — productivity tools should never
         feel like the content is jammed under the header. 48px gives
         the timer room to feel like the focus of the page. */
      .pm-stage { max-width: 980px; margin: 0 auto; padding: 48px 24px 56px; }
      .pm-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 264px;
        gap: 32px; /* a touch wider — the cards don't have walls anymore */
        align-items: start;
      }
      @media (max-width: 880px) {
        .pm-grid { grid-template-columns: 1fr; gap: 24px; }
      }
      /* Borderless, transparent — same discipline as Bear, Linear,
         Notion. The card chrome (bg + border + shadow) read as
         "walled-off panel" which competes with the timer for attention.
         Without it, the timer IS the page. */
      .pm-card {
        background: transparent;
        border: 0;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
      }
      .pm-timer-card {
        display: flex; flex-direction: column; align-items: center; gap: 18px;
        position: relative; /* anchor for the overflow menu in the corner */
      }

      /* Phase + cycle row */
      .pm-cycle-row {
        width: 100%; display: flex; justify-content: space-between; align-items: center;
        font-family: ${tokens.font.body};
      }
      /* Phase chip: monochrome to match the Notepad language. Phase awareness
         is carried by the ring color, the dots, and the label text — the chip
         itself doesn't need to shout. Icon picks up a faint phase tint. */
      .pm-phase {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
        padding: 4px 10px; border-radius: 999px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.78);
      }
      .pm-phase-work svg { color: #FCD34D; opacity: 0.85; }
      .pm-phase-short svg { color: #7DD3FC; opacity: 0.85; }
      .pm-phase-long svg { color: #86EFAC; opacity: 0.85; }

      .pm-cycle-counter {
        font-size: 12px; color: ${tokens.text.quiet}; font-variant-numeric: tabular-nums;
      }

      .pm-progress-dots { display: flex; gap: 8px; }
      .pm-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: rgba(255,255,255,0.10); transition: background 200ms;
      }
      .pm-dot-on { background: #FCD34D; box-shadow: 0 0 0 3px rgba(250,204,21,0.10); }

      /* Ring */
      .pm-ring-wrap {
        position: relative; width: 220px; height: 220px;
        display: flex; align-items: center; justify-content: center;
      }
      .pm-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
      .pm-ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 3; }
      .pm-ring-fg {
        fill: none; stroke-width: 3; stroke-linecap: round;
        transition: stroke-dashoffset 480ms cubic-bezier(0.22, 1, 0.36, 1), stroke 320ms;
      }
      .pm-ring-fg-work { stroke: #FCD34D; }
      .pm-ring-fg-short { stroke: #7DD3FC; }
      .pm-ring-fg-long { stroke: #86EFAC; }

      .pm-ring-inner {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px;
      }
      /* Time digits: Inter at light weight with tabular-nums and tight
         tracking. Same treatment Linear and Vercel use for numerical UI —
         feels like a finely-tuned product surface, not a terminal readout
         (mono) or a headline (Sora). */
      .pm-time {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 64px; font-weight: 300; letter-spacing: -0.045em;
        color: ${tokens.text.primary};
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'cv11', 'ss01', 'tnum';
        line-height: 1;
      }
      .pm-status {
        font-family: ${tokens.font.body};
        font-size: 11px; color: ${tokens.text.quiet};
        text-transform: uppercase; letter-spacing: 0.16em;
      }

      /* Presets */
      /* ── Duration row: segmented control ──
         Single pill container holding text-only items. Active state is
         JUST green text + a 3px green dot below — no fill change, no
         border change. Same restraint as iOS Segmented Control and
         Apple Music's filter row. Sits ~24px tall so it sits BELOW the
         hero green pill in visual weight (not above). */
      .pm-presets-row {
        display: flex; flex-wrap: wrap; align-items: center;
        justify-content: center; gap: 10px;
        font-family: ${tokens.font.body};
      }
      .pm-presets {
        display: inline-flex; align-items: center;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 3px;
        gap: 0;
      }
      .pm-preset {
        appearance: none; background: transparent; border: 0; cursor: pointer;
        position: relative;
        padding: 5px 12px 7px;
        border-radius: 7px;
        color: rgba(255,255,255,0.50);
        font-size: 12.5px; font-weight: 500; letter-spacing: -0.005em;
        font-variant-numeric: tabular-nums;
        transition: color 140ms;
      }
      .pm-preset:hover:not(:disabled) { color: rgba(255,255,255,0.85); }
      .pm-preset:focus-visible { outline: 1.5px solid rgba(255,255,255,0.35); outline-offset: 2px; }
      .pm-preset-dot {
        position: absolute;
        left: 50%; bottom: 1px;
        width: 3px; height: 3px;
        border-radius: 50%;
        background: transparent;
        transform: translateX(-50%);
        transition: background 140ms;
      }
      .pm-preset-on { color: #16A34A; }
      .pm-preset-on .pm-preset-dot { background: #16A34A; }

      /* Custom: lives outside the segmented pill. No container — just
         a quiet number input with a "min" suffix. Borrowed from how
         Linear shows arbitrary value inputs alongside enum selectors. */
      .pm-custom {
        display: inline-flex; align-items: center; gap: 4px;
        font-family: ${tokens.font.body};
      }
      .pm-custom input {
        appearance: none; background: transparent;
        border: 0; border-bottom: 1px dashed rgba(255,255,255,0.10);
        outline: none;
        color: rgba(255,255,255,0.85);
        font-family: ${tokens.font.body};
        font-size: 12.5px; font-weight: 500;
        padding: 4px 2px; width: 58px; text-align: center;
        font-variant-numeric: tabular-nums;
        transition: border-color 140ms, color 140ms;
      }
      .pm-custom input::placeholder { color: rgba(255,255,255,0.35); }
      .pm-custom input:hover { border-bottom-color: rgba(255,255,255,0.20); }
      .pm-custom input:focus { border-bottom-color: rgba(255,255,255,0.45); color: #fff; }
      .pm-custom input::-webkit-outer-spin-button,
      .pm-custom input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .pm-custom input[type=number] { -moz-appearance: textfield; }
      .pm-custom span { font-size: 12px; color: rgba(255,255,255,0.40); font-weight: 500; }

      /* Controls */
      .pm-controls {
        display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
        width: 100%; justify-content: center;
        font-family: ${tokens.font.body};
      }
      .pm-controls-spacer { flex: 1 1 auto; min-width: 0; }
      @media (max-width: 520px) { .pm-controls-spacer { display: none; } }

      /* Pill geometry — kept compact (Linear-button height ~28px). The
         full radius is the "specialty action" cue; tight padding keeps it
         from feeling like a marketing CTA. */
      .pm-btn {
        appearance: none; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 14px; border-radius: 8px;
        font-size: 12.5px; font-weight: 600; letter-spacing: -0.005em;
        border: 1px solid transparent;
        transition: background 140ms, border-color 140ms, color 140ms, transform 80ms, box-shadow 140ms;
      }
      .pm-btn:active { transform: translateY(0.5px); }
      .pm-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .pm-btn:focus-visible { outline: 1.5px solid rgba(255,255,255,0.45); outline-offset: 2px; }

      /* Primary "go" — deeper green (#16A34A, Tailwind green-600). The
         premium-button discipline: NO colored halo (that's a Dribbble
         tell). Just a single inset highlight at the top + a tight 1px
         shadow underneath. Same restraint Linear, Stripe Dashboard, and
         Notion use for production primary buttons. */
      .pm-btn-primary {
        background: #16A34A; color: #fff;
        box-shadow:
          0 1px 0 rgba(255,255,255,0.16) inset,
          0 -1px 0 rgba(0,0,0,0.12) inset,
          0 1px 2px rgba(0,0,0,0.30);
      }
      .pm-btn-primary:hover:not(:disabled) { background: #18AD51; }
      .pm-btn-primary:active:not(:disabled) {
        background: #128A40;
        box-shadow:
          0 1px 0 rgba(255,255,255,0.10) inset,
          0 -1px 0 rgba(0,0,0,0.16) inset,
          0 1px 1px rgba(0,0,0,0.20);
      }

      .pm-btn-secondary {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.88);
      }
      .pm-btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.10); }
      .pm-btn-ghost {
        background: transparent; color: rgba(255,255,255,0.55);
      }
      .pm-btn-ghost:hover:not(:disabled) {
        color: rgba(255,255,255,0.92);
        background: rgba(255,255,255,0.05);
      }

      /* Icon buttons: borderless to match Notepad's toolbar. The boxed
         look reads as "UI kit"; transparent-with-hover reads as Apple
         toolbar / Linear sidebar. */
      .pm-icon-btn {
        appearance: none; cursor: pointer;
        width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: transparent;
        border: 0;
        color: rgba(255,255,255,0.50);
        transition: color 140ms, background 140ms;
      }
      .pm-icon-btn:hover { color: rgba(255,255,255,0.92); background: rgba(255,255,255,0.06); }
      .pm-icon-btn[aria-pressed="true"] {
        color: rgba(255,255,255,0.95);
        background: rgba(255,255,255,0.09);
      }
      .pm-icon-btn:focus-visible { outline: 1.5px solid rgba(255,255,255,0.45); outline-offset: 2px; }

      /* ── Overflow menu (Linear / Notion / Things 3 pattern) ──
         Trigger sits absolute in the top-right corner of the timer card —
         present but quiet. The menu itself opens beneath it as a small
         dark popover with one item per row. Items use the same monochrome
         language as Notepad: white-on-dark, no accent colors. */
      .pm-overflow {
        position: absolute; top: 0; right: 0;
        z-index: 5;
      }
      .pm-overflow-trigger {
        color: rgba(255,255,255,0.40);
      }
      .pm-overflow-menu {
        position: absolute; top: 100%; right: 0; margin-top: 6px;
        min-width: 240px;
        background: rgba(20, 22, 28, 0.96);
        backdrop-filter: blur(14px) saturate(140%);
        -webkit-backdrop-filter: blur(14px) saturate(140%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        box-shadow:
          0 1px 0 rgba(255,255,255,0.04) inset,
          0 12px 32px rgba(0,0,0,0.45),
          0 4px 12px rgba(0,0,0,0.30);
        padding: 6px;
        font-family: ${tokens.font.body};
        transform-origin: top right;
      }
      .pm-menu-item {
        appearance: none; cursor: pointer;
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 8px 10px;
        background: transparent; border: 0; border-radius: 8px;
        color: rgba(255,255,255,0.85);
        font-size: 13px; font-weight: 500; letter-spacing: -0.005em;
        text-align: left;
        transition: background 120ms, color 120ms;
      }
      .pm-menu-item:hover:not(:disabled) {
        background: rgba(255,255,255,0.06);
        color: #fff;
      }
      .pm-menu-item:disabled { opacity: 0.35; cursor: not-allowed; }
      .pm-menu-item svg { color: rgba(255,255,255,0.55); flex-shrink: 0; }
      .pm-menu-item:hover:not(:disabled) svg { color: rgba(255,255,255,0.92); }
      .pm-menu-item > span:first-of-type { flex: 1 1 auto; }
      .pm-menu-state {
        font-size: 11.5px; color: rgba(255,255,255,0.42);
        font-weight: 500; letter-spacing: 0.02em;
      }
      .pm-menu-divider {
        height: 1px; background: rgba(255,255,255,0.06);
        margin: 6px 4px;
      }
      .pm-menu-hint {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 10px;
        font-size: 11.5px; color: rgba(255,255,255,0.42);
      }
      .pm-menu-hint kbd {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 10.5px;
        padding: 1px 5px; border-radius: 4px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        color: rgba(255,255,255,0.65);
      }

      /* Stats */
      .pm-stats-card { display: flex; flex-direction: column; gap: 10px; }
      .pm-stats-head {
        display: inline-flex; align-items: center; gap: 8px;
        font-family: ${tokens.font.body};
        font-size: 11.5px; font-weight: 600;
        letter-spacing: 0.16em; text-transform: uppercase;
        color: ${tokens.text.kicker};
      }
      .pm-stats-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
      }
      .pm-stat {
        background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 10px;
        padding: 10px 12px;
      }
      /* Stat values share the time-digit treatment (Inter, tabular-nums)
         so the whole sidebar reads as one cohesive numerical display. */
      .pm-stat-value {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 19px; font-weight: 500; letter-spacing: -0.025em;
        color: ${tokens.text.primary};
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
        line-height: 1.15;
      }
      .pm-stat-label {
        font-family: ${tokens.font.body};
        font-size: 11px; color: ${tokens.text.quiet};
        margin-top: 2px;
      }
      .pm-stats-foot {
        font-family: ${tokens.font.body};
        font-size: 11.5px; color: ${tokens.text.quiet};
        margin: 0;
      }

      /* Settings popover */
      .pm-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.55);
        z-index: 60;
      }
      .pm-popover {
        position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: min(440px, calc(100vw - 32px));
        max-height: calc(100vh - 64px); overflow: auto;
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.default};
        border-radius: 18px;
        padding: 18px 18px 14px;
        box-shadow: 0 32px 80px -20px rgba(0,0,0,0.7);
        z-index: 61;
      }
      .pm-popover-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 6px;
      }
      .pm-popover-head h3 {
        font-family: ${tokens.font.display};
        font-size: 16px; font-weight: 700; letter-spacing: -0.01em;
        color: ${tokens.text.primary}; margin: 0;
      }
      .pm-row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; padding: 12px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        font-family: ${tokens.font.body};
      }
      .pm-row:last-of-type { border-bottom: 0; }
      .pm-row-label { font-size: 13.5px; color: ${tokens.text.primary}; font-weight: 500; }
      .pm-row-desc { font-size: 12px; color: ${tokens.text.quiet}; margin-top: 2px; }

      .pm-switch {
        appearance: none; cursor: pointer;
        width: 36px; height: 20px;
        border-radius: 999px;
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.10);
        position: relative; transition: background 180ms, border-color 180ms;
        flex: 0 0 36px;
      }
      .pm-switch-thumb {
        position: absolute; left: 2px; top: 50%; transform: translateY(-50%);
        width: 14px; height: 14px; border-radius: 50%;
        background: #fff; transition: left 180ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .pm-switch-on { background: #3D6BE8; border-color: #3D6BE8; }
      .pm-switch-on .pm-switch-thumb { left: 18px; }
      .pm-switch:focus-visible { outline: 2px solid #4F7DFF; outline-offset: 2px; }

      .pm-numgrid {
        display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
        margin-top: 14px;
      }
      @media (max-width: 480px) { .pm-numgrid { grid-template-columns: 1fr; } }
      .pm-num {
        display: flex; flex-direction: column; gap: 6px;
        font-family: ${tokens.font.body};
      }
      .pm-num span { font-size: 11.5px; color: ${tokens.text.quiet}; }
      .pm-num input {
        appearance: none; background: ${tokens.bg.chrome};
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        padding: 8px 10px; color: ${tokens.text.primary};
        font-family: inherit; font-size: 13px;
        font-variant-numeric: tabular-nums;
        outline: none; transition: border-color 160ms;
      }
      .pm-num input:focus { border-color: #4F7DFF; }

      /* Distraction-free overlay */
      .pm-focus {
        position: fixed; inset: 0; z-index: 70;
        background: #0A0C10;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 20px;
      }
      /* Fullscreen digits: ultra-thin Inter at giant size. The discipline
         is "the larger the digits, the lighter the weight + the looser
         the tracking" — same as iOS Lock Screen, Apple Watch faces,
         Things 3 timer. Heavy/tight at this scale reads as scoreboard. */
      .pm-focus-time {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: clamp(6rem, 18vw, 13rem);
        font-weight: 200; letter-spacing: -0.025em;
        color: #fff;
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
        line-height: 1;
      }
      .pm-focus-label {
        font-family: ${tokens.font.body};
        font-size: 12px; color: rgba(255,255,255,0.32);
        text-transform: uppercase; letter-spacing: 0.22em;
        margin-top: 4px;
      }
      /* Exit lives in the top-right corner — invisible until you look for
         it. Same pattern Bear, iA Writer, and Notion use for fullscreen
         exit. The keyboard hint lives at the bottom in case the user
         doesn't know about Esc. */
      .pm-focus-exit {
        position: absolute; top: 20px; right: 20px;
        appearance: none; cursor: pointer;
        width: 32px; height: 32px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: transparent; border: 0;
        color: rgba(255,255,255,0.22);
        transition: color 160ms, background 160ms, opacity 160ms;
      }
      .pm-focus-exit:hover {
        color: rgba(255,255,255,0.95);
        background: rgba(255,255,255,0.06);
      }
      .pm-focus-exit:focus-visible {
        outline: 1.5px solid rgba(255,255,255,0.45);
        outline-offset: 2px;
        color: rgba(255,255,255,0.85);
      }
      .pm-focus-hint {
        position: absolute; bottom: 28px; left: 50%;
        transform: translateX(-50%);
        font-family: ${tokens.font.body};
        font-size: 11px; color: rgba(255,255,255,0.20);
        letter-spacing: 0.04em;
      }
      .pm-focus-hint kbd {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 10px;
        padding: 1px 5px; border-radius: 4px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.40);
        margin: 0 2px;
      }

      /* Phone tweaks */
      @media (max-width: 600px) {
        .pm-stage { padding: 32px 16px 48px; }
        .pm-ring-wrap { width: 188px; height: 188px; }
        .pm-time { font-size: 48px; }
        .pm-stats-grid { grid-template-columns: 1fr 1fr; }
      }
    `}</style>
  );
}

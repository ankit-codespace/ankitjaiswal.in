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
  dailyTargetSessions: number;
}

interface CompletedSession {
  id: string;
  timestamp: number;
  durationMin: number;
}

interface Stats {
  date: string; // YYYY-MM-DD
  todayFocusMs: number;
  todaySessions: number;
  lifetimeFocusMs: number;
  lifetimeSessions: number;
  history: Record<string, number>;
  currentStreak: number;
  maxStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  completedSessionsToday?: CompletedSession[];
}

const SETTINGS_KEY = "ankit:pomodoro:settings:v1";
const STATS_KEY = "ankit:pomodoro:stats:v1";
const STATS_BACKUP_KEY = "ankit:pomodoro:stats:backup:v1";

const DEFAULT_SETTINGS: Settings = {
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  longBreakAfter: 4,
  sound: true,
  notifications: false,
  autoStartBreak: true,
  autoStartWork: false,
  dailyTargetSessions: 4,
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
 *  Also resets currentStreak if they missed the day before today. */
function rolloverIfNeeded(prev: Stats): Stats {
  const today = todayKey();
  if (prev.date === today) return prev;

  // Calculate if the streak is broken (i.e. did they focus yesterday?)
  let currentStreak = prev.currentStreak || 0;
  const lastActive = prev.lastActiveDate;
  if (lastActive) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ym = String(yesterday.getMonth() + 1).padStart(2, "0");
    const yd = String(yesterday.getDate()).padStart(2, "0");
    const yesterdayStr = `${yesterday.getFullYear()}-${ym}-${yd}`;

    // If they were not active today and not active yesterday, reset streak
    if (lastActive !== today && lastActive !== yesterdayStr) {
      currentStreak = 0;
    }
  } else {
    currentStreak = 0;
  }

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
    currentStreak,
    completedSessionsToday: [],
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
    currentStreak: 0,
    maxStreak: 0,
    lastActiveDate: "",
    completedSessionsToday: [],
  };
  if (typeof window === "undefined") return empty;
  
  // Try main key first
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stats;
      if (parsed && typeof parsed === "object") {
        const merged: Stats = {
          ...empty,
          ...parsed,
          history: parsed.history || {},
          completedSessionsToday: parsed.completedSessionsToday || [],
        };
        return rolloverIfNeeded(merged);
      }
    }
  } catch (e) {
    console.error("Failed to parse main Pomodoro stats:", e);
  }

  // Try backup key if main is absent or corrupt
  try {
    const rawBackup = localStorage.getItem(STATS_BACKUP_KEY);
    if (rawBackup) {
      const parsed = JSON.parse(rawBackup) as Stats;
      if (parsed && typeof parsed === "object") {
        const merged: Stats = {
          ...empty,
          ...parsed,
          history: parsed.history || {},
          completedSessionsToday: parsed.completedSessionsToday || [],
        };
        return rolloverIfNeeded(merged);
      }
    }
  } catch (e) {
    console.error("Failed to parse backup Pomodoro stats:", e);
  }

  return empty;
}

function saveStats(s: Stats): void {
  try {
    const raw = JSON.stringify(s);
    localStorage.setItem(STATS_KEY, raw);
    localStorage.setItem(STATS_BACKUP_KEY, raw);
  } catch { /* noop */ }
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

function fmtFocusTimeLive(ms: number, isActive: boolean): string {
  const totalSeconds = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSeconds / 60);

  if (isActive) {
    const s = totalSeconds % 60;
    if (totalMin < 60) return `${totalMin}m ${s}s`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m ${s}s`;
  }

  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Largest single-day focus, including today. */
function bestDayMs(stats: Stats): number {
  const vals = Object.values(stats.history);
  const all = [...vals, stats.todayFocusMs];
  return all.reduce((max, v) => (v > max ? v : max), 0);
}

const WORK_QUOTES = [
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Deep work is the superpower of the 21st century.", author: "Cal Newport" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "One can fractionate days, but not focus.", author: "Naval Ravikant" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" }
];

const BREAK_QUOTES = [
  { text: "Tension is who you think you should be. Relaxation is who you are.", author: "Lao Tzu" },
  { text: "Breathe in, breathe out. Let go of the past, let go of the future.", author: "Thich Nhat Hanh" },
  { text: "Muddy water is best cleared by leaving it alone.", author: "Alan Watts" },
  { text: "The time to relax is when you don't have time for it.", author: "Sydney J. Harris" },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott" },
  { text: "Rest is not idleness, and to lie sometimes on the grass under trees... is by no means a waste of time.", author: "John Lubbock" }
];

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

  const [currentQuote, setCurrentQuote] = useState<{ text: string; author: string } | null>(null);
  const [scrollBounce, setScrollBounce] = useState(false);
  const [isCircleHovered, setIsCircleHovered] = useState(false);
  const dialRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = phase === "work" ? WORK_QUOTES : BREAK_QUOTES;
    const random = list[Math.floor(Math.random() * list.length)];
    setCurrentQuote(random);
  }, [phase]);

  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        return (localStorage.getItem("ankit:pomodoro:theme") as "system" | "light" | "dark") || "system";
      } catch {
        return "system";
      }
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("ankit:pomodoro:theme", theme);
    } catch { /* noop */ }

    let cleanup: (() => void) | undefined;

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: light)");
      setResolvedTheme(media.matches ? "light" : "dark");

      const listener = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? "light" : "dark");
      };
      media.addEventListener("change", listener);
      cleanup = () => media.removeEventListener("change", listener);
    } else {
      setResolvedTheme(theme);
    }

    return cleanup;
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (resolvedTheme === "light") {
      document.body.classList.add("pm-light-mode");
    } else {
      document.body.classList.remove("pm-light-mode");
    }
    return () => {
      document.body.classList.remove("pm-light-mode");
    };
  }, [resolvedTheme]);

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

  const creditPartialFocus = useCallback((ms: number) => {
    if (ms <= 1000) return; // Ignore brief ticks less than a second
    setStats((prev) => {
      const rolled = rolloverIfNeeded(prev);
      const today = todayKey();
      
      // Calculate new streak
      let newStreak = rolled.currentStreak || 0;
      const lastActive = rolled.lastActiveDate;
      
      if (!lastActive) {
        newStreak = 1;
      } else if (lastActive === today) {
        // Already active today
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ym = String(yesterday.getMonth() + 1).padStart(2, "0");
        const yd = String(yesterday.getDate()).padStart(2, "0");
        const yesterdayStr = `${yesterday.getFullYear()}-${ym}-${yd}`;
        
        if (lastActive === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
      const newMaxStreak = Math.max(rolled.maxStreak || 0, newStreak);
      
      return {
        ...rolled,
        todayFocusMs: rolled.todayFocusMs + ms,
        lifetimeFocusMs: rolled.lifetimeFocusMs + ms,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        lastActiveDate: today,
      };
    });
  }, []);

  completeSegmentRef.current = () => {
    // Update stats on completed *work* segments
    if (phase === "work") {
      // Credit the duration that ACTUALLY ran (set at startSegment), not
      // the current setting — protects against mid-session changes.
      const credited = currentWorkDurMsRef.current ?? settings.workMin * 60_000;
      currentWorkDurMsRef.current = null;
      setStats((prev) => {
        const rolled = rolloverIfNeeded(prev);
        const today = todayKey();
        
        // Calculate new streak
        let newStreak = rolled.currentStreak || 0;
        const lastActive = rolled.lastActiveDate;
        
        if (!lastActive) {
          newStreak = 1;
        } else if (lastActive === today) {
          // Already active today
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const ym = String(yesterday.getMonth() + 1).padStart(2, "0");
          const yd = String(yesterday.getDate()).padStart(2, "0");
          const yesterdayStr = `${yesterday.getFullYear()}-${ym}-${yd}`;
          
          if (lastActive === yesterdayStr) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        }
        const newMaxStreak = Math.max(rolled.maxStreak || 0, newStreak);
        const durationMin = Math.round(credited / 60_000);
        const newSession: CompletedSession = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          durationMin,
        };
        const updatedSessions = [...(rolled.completedSessionsToday || []), newSession];

        return {
          ...rolled,
          todayFocusMs: rolled.todayFocusMs + credited,
          todaySessions: rolled.todaySessions + 1,
          lifetimeFocusMs: rolled.lifetimeFocusMs + credited,
          lifetimeSessions: rolled.lifetimeSessions + 1,
          currentStreak: newStreak,
          maxStreak: newMaxStreak,
          lastActiveDate: today,
          completedSessionsToday: updatedSessions,
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
    if (phase === "work" && (running || paused)) {
      creditPartialFocus(elapsedThisSessionMs);
    }
    currentWorkDurMsRef.current = null;
    setRunning(false);
    setPaused(false);
    setEndAt(null);
    setPausedRemainMs(null);
    setPhase("work");
    setCyclePos(0);
  }, [phase, running, paused, elapsedThisSessionMs, creditPartialFocus]);

  const handleSkip = useCallback(() => {
    if (phase === "work" && (running || paused)) {
      creditPartialFocus(elapsedThisSessionMs);
    }
    currentWorkDurMsRef.current = null;
    // Move to next phase WITHOUT crediting a full completed session.
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
  }, [phase, running, paused, elapsedThisSessionMs, creditPartialFocus, cyclePos, settings.longBreakAfter, settings.autoStartBreak, settings.autoStartWork, startSegment]);

  const setWorkPreset = useCallback((min: number) => {
    setSettings((s) => ({ ...s, workMin: min }));
    if (phase === "work" && !running) {
      // refresh display to new duration
      setEndAt(null);
      setPausedRemainMs(null);
    }
  }, [phase, running]);

  const scrollTimeoutRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const runningRef = useRef(running);
  const setWorkPresetRef = useRef(setWorkPreset);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    setWorkPresetRef.current = setWorkPreset;
  }, [setWorkPreset]);

  useEffect(() => {
    const el = dialRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (runningRef.current) return;
      
      // Prevent default scroll behavior of page
      e.preventDefault();
      
      const direction = e.deltaY < 0 ? 1 : -1;
      const step = 5;
      const currentMin = settingsRef.current.workMin;
      let nextMin = currentMin + direction * step;
      
      if (nextMin < 5) nextMin = 5;
      if (nextMin > 120) nextMin = 120;

      if (nextMin !== currentMin) {
        setWorkPresetRef.current(nextMin);
        
        setScrollBounce(true);
        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => {
          setScrollBounce(false);
        }, 150);
      }
    };

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, []);

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
      a: "25 minutes is the canonical Pomodoro duration — long enough to make real progress, short enough that your brain doesn't fatigue. But people work differently: deep coding may want 45–60 minute blocks, quick admin tasks may suit 15. Use the preset chips (25 / 30 / 45 / 60) or type a custom duration up to 2 hours.",
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
      desc: "25/30/45/60-minute preset chips, plus a custom input up to 2 hours. Change short and long break lengths from settings.",
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
  const toggleThemeWithRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const currentTheme = resolvedTheme;
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    
    // Fallback if View Transitions API is not supported
    if (!(document as any).startViewTransition) {
      setTheme(nextTheme);
      return;
    }
    
    // 1. Get click coordinate
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || (rect.left + rect.width / 2);
    const y = e.clientY || (rect.top + rect.height / 2);
    
    // 2. Calculate final radius to cover the entire viewport
    const w = window.innerWidth;
    const h = window.innerHeight;
    const endRadius = Math.hypot(
      Math.max(x, w - x),
      Math.max(y, h - y)
    );
    
    // 3. Initiate the transition
    const transition = (document as any).startViewTransition(() => {
      setTheme(nextTheme);
    });
    
    // 4. Animate the incoming theme snapshot outward from the click coordinate
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 500,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)"
        }
      );
    });
  };

  const headerActions = (
    <button
      type="button"
      className={`pm-skeuo-toggle ${resolvedTheme}`}
      onClick={toggleThemeWithRipple}
      aria-label={`Toggle theme. Current: ${resolvedTheme}`}
      title={`Theme: ${resolvedTheme}`}
    >
      <span className="pm-skeuo-track">
        <span className="pm-skeuo-text pm-skeuo-text-light">LIGHT</span>
        <span className="pm-skeuo-text pm-skeuo-text-dark">DARK</span>
        <span className="pm-skeuo-thumb">
          {resolvedTheme === "light" ? (
            <svg viewBox="0 0 24 24" className="pm-toggle-icon pm-sun-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="pm-toggle-icon pm-moon-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );

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
      headerActions={headerActions}
      bgColor="var(--pm-page-bg)"
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

            <div
              ref={dialRef}
              data-lenis-prevent
              className={`pm-ring-wrap ${!running ? "pm-ring-adjustable" : ""} ${isCircleHovered && !running ? "pm-ring-hovered" : ""}`}
              onMouseEnter={() => setIsCircleHovered(true)}
              onMouseLeave={() => setIsCircleHovered(false)}
            >
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
                {!running && (
                  <div className={`pm-dial-chevron pm-dial-chevron-up ${isCircleHovered ? "visible" : ""}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </div>
                )}
                <div className={`pm-time ${scrollBounce ? "pm-scroll-bounce" : ""}`} aria-live="polite">
                  {fmtMMSS(remainingMs)}
                </div>
                {!running && (
                  <div className={`pm-dial-chevron pm-dial-chevron-down ${isCircleHovered ? "visible" : ""}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                )}
                <div className="pm-status-container">
                  <span className={`pm-status-label ${!running && isCircleHovered ? "hidden-label" : ""}`}>{phaseHint}</span>
                  {!running && (
                    <span className={`pm-status-scroll-label ${isCircleHovered ? "visible-label" : ""}`}>Scroll dial</span>
                  )}
                </div>
              </div>
            </div>

            {/* Presets or Mindful Quote slot */}
            <div className="pm-interactive-slot">
              {!running ? (
                <div className="pm-presets-row">
                  <div className="pm-presets">
                    {[25, 30, 45, 60].map((min) => {
                      const active = settings.workMin === min;
                      return (
                        <button
                          key={min}
                          type="button"
                          className={`pm-preset ${active ? "pm-preset-on" : ""}`}
                          onClick={() => setWorkPreset(min)}
                        >
                          <span>{min}m</span>
                          <span className="pm-preset-dot" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="pm-custom">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.workMin}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 5 && val <= 120) {
                          setWorkPreset(val);
                        }
                      }}
                    />
                    <span>min</span>
                  </div>
                </div>
              ) : (
                currentQuote && (
                  <div className="pm-quote-container">
                    <p className="pm-quote-text">“{currentQuote.text}”</p>
                    <span className="pm-quote-author">— {currentQuote.author}</span>
                  </div>
                )
              )}
            </div>


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
              <Stat value={fmtFocusTimeLive(liveStats.todayFocusMs, running && phase === "work")} label="Focus today" />
              <Stat value={`${stats.todaySessions} / ${settings.dailyTargetSessions}`} label="Daily goal">
                <div className="pm-goal-dots" aria-label={`${stats.todaySessions} of ${settings.dailyTargetSessions} cycles complete`}>
                  {Array.from({ length: settings.dailyTargetSessions }).map((_, i) => (
                    <div
                      key={i}
                      className={`pm-goal-dot ${i < stats.todaySessions ? "complete" : ""}`}
                    />
                  ))}
                </div>
              </Stat>
              <Stat value={`${stats.currentStreak || 0} d`} label="Active streak" />
              <Stat value={fmtFocusTime(Object.values(liveStats.history).reduce((a, b) => a + b, 0) + liveStats.todayFocusMs)} label="30-day total" />
              <Stat value={fmtFocusTime(bestDayMs(liveStats))} label="Best day" />
              <Stat value={fmtFocusTime(liveStats.lifetimeFocusMs)} label="Lifetime focus" />
            </div>

            <div className="pm-timeline">
              <div className="pm-timeline-head">Today's Timeline</div>
              {liveStats.completedSessionsToday && liveStats.completedSessionsToday.length > 0 ? (
                <div className="pm-timeline-list">
                  {liveStats.completedSessionsToday.map((sess, idx) => {
                    const dateObj = new Date(sess.timestamp);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={sess.id || idx} className="pm-timeline-item">
                        <div className="pm-timeline-dot-wrapper">
                          <div className="pm-timeline-dot" />
                          {idx < liveStats.completedSessionsToday!.length - 1 && (
                            <div className="pm-timeline-line" />
                          )}
                        </div>
                        <div className="pm-timeline-content">
                          <span className="pm-timeline-time">{timeStr}</span>
                          <span className="pm-timeline-desc">{sess.durationMin}m sprint</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="pm-timeline-empty">
                  No sprints logged today yet.
                </div>
              )}
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
                <NumField
                  label="Daily target"
                  value={settings.dailyTargetSessions}
                  min={1} max={12}
                  onChange={(v) => setSettings((s) => ({ ...s, dailyTargetSessions: v }))}
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

function Stat({ value, label, children }: { value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="pm-stat">
      <div className="pm-stat-value">{value}</div>
      <div className="pm-stat-label">{label}</div>
      {children}
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
      /* View transition customizations for seamless theme toggle */
      ::view-transition-old(root) {
        animation: none;
        mix-blend-mode: normal;
      }
      ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
      }
      ::view-transition-image-pair(root) {
        isolation: auto;
      }

      :root {
        --pm-page-bg: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.08) 0%, rgba(74, 222, 128, 0.02) 40%, var(--bg0) 80%);
        --pm-work: var(--hi);
        --pm-short: var(--ok);
        --pm-long: var(--warn);
      }

      body.pm-light-mode {
        /* SURFACES — warm-neutral light, desaturated green tint */
        --bg0: #fdfdfe;     /* Pure white base color */
        --bg1: rgba(255, 255, 255, 0.72); /* Frosted panels so atmospheric tint can breathe through */
        --bg2: #f2f2ef;     /* Secondary surfaces */
        --bg3: #ebebe8;     /* Selected/elevated rows */
        --bg4: #dcdcd6;     /* Hover state */

        /* BORDERS — dark strokes at very low opacity to adapt to gradient background */
        --b0: rgba(22, 22, 21, 0.08);
        --b1: rgba(22, 22, 21, 0.14);
        --b2: rgba(22, 22, 21, 0.20);
        --b3: rgba(22, 22, 21, 0.35);

        /* TYPOGRAPHY — deep warm-ink color for maximum readability and contrast */
        --t1: #161615;      /* Primary text (almost black) */
        --t2: #4a4a46;      /* Body text (dark grey) */
        --t3: #7c7c75;      /* Muted text (grey) */
        --t4: #a8a8a0;      /* Ghost text */

        /* SEMANTIC OVERRIDES FOR LIGHT MODE */
        --pm-work: #16a34a;  /* Vibrant yet organic green */
        --pm-short: #0284c7; /* Deep ocean blue */
        --pm-long: #d97706;  /* Warm amber */
        --ok: #16a34a;
        --warn: #d97706;

        /* Fix: Set to transparent to prevent doubling background gradients over the body layer */
        --pm-page-bg: transparent;
      }

      html:has(body.pm-light-mode) {
        background-color: #fdfdfe !important;
      }

      body.pm-light-mode {
        --layout-bg: transparent !important;
        background-color: #fdfdfe !important;
        background-image:
          radial-gradient(ellipse 100% 60% at 50% -10%, rgba(96, 165, 250, 0.45) 0%, transparent 60%),
          radial-gradient(ellipse 55% 80% at -5% 50%, rgba(96, 165, 250, 0.45) 0%, transparent 60%),
          radial-gradient(ellipse 55% 80% at 105% 50%, rgba(96, 165, 250, 0.45) 0%, transparent 60%) !important;
        background-attachment: fixed !important;
      }

      body.pm-light-mode .pm-card {
        background: rgba(255, 255, 255, 0.72);
        border-color: rgba(13, 17, 23, 0.09);
        box-shadow: 0 18px 50px rgba(13, 17, 23, 0.06),
                    0 0 0 1px rgba(13, 17, 23, 0.03),
                    inset 0 1px 0 0 rgba(255,255,255,0.82);
      }

      body.pm-light-mode .pm-btn-secondary {
        background: rgba(0,0,0,0.04);
        border-color: rgba(0,0,0,0.06);
        color: rgba(22, 22, 21, 0.88);
      }
      body.pm-light-mode .pm-btn-secondary:hover {
        background: rgba(0,0,0,0.07);
      }

      body.pm-light-mode .pm-btn-ghost {
        color: rgba(22, 22, 21, 0.60);
      }
      body.pm-light-mode .pm-btn-ghost:hover {
        color: rgba(22, 22, 21, 0.92);
        background: rgba(0,0,0,0.04);
      }

      body.pm-light-mode .pm-icon-btn {
        color: rgba(22, 22, 21, 0.50);
      }
      body.pm-light-mode .pm-icon-btn:hover {
        color: rgba(22, 22, 21, 0.92);
        background: rgba(0,0,0,0.05);
      }
      body.pm-light-mode .pm-icon-btn[aria-pressed="true"] {
        color: rgba(22, 22, 21, 0.95);
        background: rgba(0,0,0,0.08);
      }

      body.pm-light-mode .pm-overflow-menu {
        background: rgba(253, 253, 252, 0.98);
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow:
          0 1px 0 rgba(255,255,255,0.8) inset,
          0 12px 32px rgba(0,0,0,0.08),
          0 4px 12px rgba(0,0,0,0.04);
      }

      body.pm-light-mode .pm-menu-item {
        color: rgba(22, 22, 21, 0.85);
      }
      body.pm-light-mode .pm-menu-item:hover:not(:disabled) {
        background: rgba(22, 22, 21, 0.05);
        color: var(--t1);
      }
      body.pm-light-mode .pm-menu-item svg {
        color: rgba(22, 22, 21, 0.55);
      }
      body.pm-light-mode .pm-menu-item:hover:not(:disabled) svg {
        color: var(--t1);
      }
      body.pm-light-mode .pm-menu-state {
        color: rgba(22, 22, 21, 0.42);
      }
      body.pm-light-mode .pm-menu-divider {
        background: rgba(22, 22, 21, 0.06);
      }
      body.pm-light-mode .pm-menu-hint {
        color: rgba(22, 22, 21, 0.42);
      }
      body.pm-light-mode .pm-menu-hint kbd {
        background: rgba(22, 22, 21, 0.05);
        border: 1px solid rgba(22, 22, 21, 0.10);
        color: rgba(22, 22, 21, 0.65);
      }

      body.pm-light-mode .pm-focus {
        background: #fafaf9;
      }
      body.pm-light-mode .pm-focus-time {
        color: #161615;
      }
      body.pm-light-mode .pm-focus-label {
        color: rgba(22, 22, 21, 0.4);
      }
      body.pm-light-mode .pm-focus-exit {
        color: rgba(22, 22, 21, 0.35);
      }
      body.pm-light-mode .pm-focus-exit:hover {
        color: rgba(22, 22, 21, 0.95);
        background: rgba(22, 22, 21, 0.05);
      }
      body.pm-light-mode .pm-focus-hint {
        color: rgba(22, 22, 21, 0.4);
      }
      body.pm-light-mode .pm-focus-hint kbd {
        background: rgba(22, 22, 21, 0.03);
        border: 1px solid rgba(22, 22, 21, 0.08);
        color: rgba(22, 22, 21, 0.6);
      }

      body.pm-light-mode .pm-popover {
        background: #ffffff;
        box-shadow: 0 32px 80px -20px rgba(22, 22, 21, 0.15);
      }

      /* Skeuomorphic Premium Toggle */
      .pm-skeuo-toggle {
        appearance: none;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        outline: none;
        position: relative;
        z-index: 1000;
        vertical-align: middle;
      }
      .pm-skeuo-track {
        display: block;
        width: 82px;
        height: 32px;
        border-radius: 999px;
        position: relative;
        transition: background 0.3s ease, box-shadow 0.3s ease;
      }
      .pm-skeuo-text {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        font-family: var(--s);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1;
        transition: opacity 0.3s ease, color 0.3s ease;
        pointer-events: none;
      }
      .pm-skeuo-thumb {
        position: absolute;
        top: 3px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s ease, box-shadow 0.3s ease;
      }
      .pm-toggle-icon {
        width: 14px;
        height: 14px;
        transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      }

      /* Light Mode Specifics */
      body.pm-light-mode .pm-skeuo-track {
        background: #e4e4e7;
        box-shadow: inset 2px 2px 5px rgba(22, 22, 21, 0.08), inset -2px -2px 5px rgba(255, 255, 255, 0.9);
      }
      body.pm-light-mode .pm-skeuo-thumb {
        transform: translateX(3px);
        background: #ffffff;
        box-shadow: 1.5px 1.5px 4px rgba(22, 22, 21, 0.08), -1px -1px 3px rgba(255, 255, 255, 0.9);
      }
      body.pm-light-mode .pm-skeuo-text-light {
        opacity: 0;
      }
      body.pm-light-mode .pm-skeuo-text-dark {
        opacity: 1;
        right: 12px;
        color: rgba(22, 22, 21, 0.50);
      }
      body.pm-light-mode .pm-sun-icon {
        color: #f59e0b;
        transform: rotate(0deg);
      }

      /* Dark Mode Specifics */
      body:not(.pm-light-mode) .pm-skeuo-track {
        background: #141416;
        box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.4), inset -1px -1px 2px rgba(255, 255, 255, 0.03);
      }
      body:not(.pm-light-mode) .pm-skeuo-thumb {
        transform: translateX(53px); /* 82 - 26 - 3 = 53 */
        background: #232326;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.4), -1px -1px 2px rgba(255, 255, 255, 0.03);
      }
      body:not(.pm-light-mode) .pm-skeuo-text-light {
        opacity: 1;
        left: 12px;
        color: rgba(255, 255, 255, 0.35);
      }
      body:not(.pm-light-mode) .pm-skeuo-text-dark {
        opacity: 0;
      }
      body:not(.pm-light-mode) .pm-moon-icon {
        color: var(--t1);
        transform: rotate(0deg);
      }

      /* Focus / hover state indicators */
      .pm-skeuo-toggle:focus-visible .pm-skeuo-track {
        outline: 2px solid var(--b3);
        outline-offset: 2px;
      }
      .pm-skeuo-toggle:hover .pm-skeuo-thumb {
        filter: brightness(1.05);
      }

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
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        background: var(--bg1);
        border: 1px solid var(--b0);
        border-radius: 20px;
        padding: 32px 24px;
        box-shadow: 0 40px 100px -25px rgba(0,0,0,0.85),
                    0 0 0 1px rgba(255,255,255,0.01),
                    inset 0 1px 0 0 rgba(255,255,255,0.05);
        position: relative;
      }
      .pm-card::before {
        content: "";
        position: absolute; inset: 0;
        z-index: 0;
        pointer-events: none;
        opacity: 0.022;
        border-radius: inherit;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
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
        background: var(--bg2);
        border: 1px solid var(--b0);
        color: ${tokens.text.primary};
      }
      .pm-phase-work svg { color: var(--pm-work); opacity: 0.85; }
      .pm-phase-short svg { color: var(--pm-short); opacity: 0.85; }
      .pm-phase-long svg { color: var(--pm-long); opacity: 0.85; }

      .pm-cycle-counter {
        font-size: 12px; color: ${tokens.text.quiet}; font-variant-numeric: tabular-nums;
      }

      .pm-progress-dots { display: flex; gap: 8px; }
      .pm-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--bg3); transition: background 200ms;
      }
      .pm-dot-on { background: var(--ok); box-shadow: 0 0 0 3px var(--ok2); }

      /* Ring */
      .pm-ring-wrap {
        position: relative; width: 240px; height: 240px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%;
        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease;
      }
      .pm-ring-adjustable {
        cursor: ns-resize;
      }
      .pm-ring-hovered {
        transform: scale(1.025);
      }
      body:not(.pm-light-mode) .pm-ring-hovered .pm-ring-bg {
        stroke: rgba(255, 255, 255, 0.08);
      }
      body.pm-light-mode .pm-ring-hovered .pm-ring-bg {
        stroke: rgba(0, 0, 0, 0.08);
      }
      .pm-ring {
        width: 100%; height: 100%; transform: rotate(-90deg);
        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .pm-ring-bg {
        fill: none; stroke: var(--b1); stroke-width: 1.5;
        transition: stroke 0.3s ease;
      }
      .pm-ring-fg {
        fill: none; stroke-width: 4; stroke-linecap: round;
        transition: stroke-dashoffset 480ms cubic-bezier(0.22, 1, 0.36, 1), stroke 320ms;
      }
      .pm-ring-fg-work { stroke: var(--pm-work); }
      .pm-ring-fg-short { stroke: var(--pm-short); }
      .pm-ring-fg-long { stroke: var(--pm-long); }

      /* Scroll bounce effect on digits */
      .pm-scroll-bounce {
        animation: pm-digit-bounce 0.15s cubic-bezier(0.25, 1, 0.5, 1) alternate;
      }
      @keyframes pm-digit-bounce {
        0% { transform: scale(1); }
        50% { transform: scale(1.06); text-shadow: 0 0 12px rgba(22, 163, 74, 0.2); }
        100% { transform: scale(1); }
      }

      /* Premium dial chevrons */
      .pm-dial-chevron {
        height: 16px;
        color: var(--pm-work, var(--hi));
        opacity: 0;
        transition: opacity 0.25s ease, transform 0.25s ease;
        pointer-events: none;
      }
      body.pm-light-mode .pm-dial-chevron {
        color: #16a34a;
      }
      .pm-dial-chevron-up {
        transform: translateY(4px);
      }
      .pm-dial-chevron-up.visible {
        opacity: 0.65;
        transform: translateY(0);
        animation: pm-chevron-float-up 1.2s ease-in-out infinite alternate;
      }
      .pm-dial-chevron-down {
        transform: translateY(-4px);
      }
      .pm-dial-chevron-down.visible {
        opacity: 0.65;
        transform: translateY(0);
        animation: pm-chevron-float-down 1.2s ease-in-out infinite alternate;
      }

      @keyframes pm-chevron-float-up {
        0% { transform: translateY(0); }
        100% { transform: translateY(-3px); }
      }
      @keyframes pm-chevron-float-down {
        0% { transform: translateY(0); }
        100% { transform: translateY(3px); }
      }
      .pm-ring-fg-long { stroke: var(--pm-long); }

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
        font-size: 56px; font-weight: 300; letter-spacing: -0.045em;
        color: ${tokens.text.primary};
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'cv11', 'ss01', 'tnum';
        line-height: 1;
        transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), text-shadow 0.15s ease;
      }
      .pm-status-container {
        position: relative;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pm-status-label, .pm-status-scroll-label {
        font-family: ${tokens.font.body};
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .pm-status-label {
        color: ${tokens.text.quiet};
        opacity: 1;
        transform: translateY(0);
      }
      .pm-status-label.hidden-label {
        opacity: 0;
        transform: translateY(-4px);
      }
      .pm-status-scroll-label {
        position: absolute;
        color: var(--pm-work, var(--hi));
        opacity: 0;
        transform: translateY(4px);
        pointer-events: none;
        white-space: nowrap;
      }
      body.pm-light-mode .pm-status-scroll-label {
        color: #16a34a;
      }
      .pm-status-scroll-label.visible-label {
        opacity: 1;
        transform: translateY(0);
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
        background: var(--bg2);
        border: 1px solid var(--b0);
        border-radius: 10px;
        padding: 3px;
        gap: 0;
      }
      .pm-preset {
        appearance: none; background: transparent; border: 0; cursor: pointer;
        position: relative;
        padding: 5px 12px 7px;
        border-radius: 7px;
        color: ${tokens.text.quiet};
        font-size: 12.5px; font-weight: 500; letter-spacing: -0.005em;
        font-variant-numeric: tabular-nums;
        transition: color 140ms;
      }
      .pm-preset:hover:not(:disabled) { color: ${tokens.text.primary}; }
      .pm-preset:focus-visible { outline: 1.5px solid var(--b3); outline-offset: 2px; }
      .pm-preset-dot {
        position: absolute;
        left: 50%; bottom: 1px;
        width: 3px; height: 3px;
        border-radius: 50%;
        background: transparent;
        transform: translateX(-50%);
        transition: background 140ms;
      }
      .pm-preset-on { color: ${tokens.text.primary}; }
      .pm-preset-on .pm-preset-dot { background: ${tokens.text.primary}; }

      /* Custom: lives outside the segmented pill. No container — just
         a quiet number input with a "min" suffix. Borrowed from how
         Linear shows arbitrary value inputs alongside enum selectors. */
      .pm-custom {
        display: inline-flex; align-items: center; gap: 4px;
        font-family: ${tokens.font.body};
      }
      .pm-custom input {
        appearance: none; background: transparent;
        border: 0; border-bottom: 1px dashed var(--b1);
        outline: none;
        color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
        font-size: 12.5px; font-weight: 500;
        padding: 4px 2px; width: 58px; text-align: center;
        font-variant-numeric: tabular-nums;
        transition: border-color 140ms, color 140ms;
      }
      .pm-custom input::placeholder { color: ${tokens.text.quiet}; }
      .pm-custom input:hover { border-bottom-color: var(--b2); }
      .pm-custom input:focus { border-bottom-color: var(--b3); color: var(--t1); }
      .pm-custom input::-webkit-outer-spin-button,
      .pm-custom input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .pm-custom input[type=number] { -moz-appearance: textfield; }
      .pm-custom span { font-size: 12px; color: var(--t3); font-weight: 500; }

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
      .pm-btn:focus-visible { outline: 1.5px solid var(--b3); outline-offset: 2px; }

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
      .pm-icon-btn:focus-visible { outline: 1.5px solid var(--b3); outline-offset: 2px; }

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
        background: var(--bg2);
        border: 1px solid var(--b0);
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

      .pm-goal-dots {
        display: flex; gap: 4px; margin-top: 6px;
      }
      .pm-goal-dot {
        width: 12px; height: 3px; border-radius: 1px;
        background: var(--b1);
        transition: background-color 200ms;
      }
      .pm-goal-dot.complete {
        background: var(--ok);
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
      }
      body.pm-light-mode .pm-goal-dot.complete {
        background: #10b981;
        box-shadow: none;
      }

      .pm-timeline {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--b1);
      }
      .pm-timeline-head {
        font-family: ${tokens.font.body};
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
        color: ${tokens.text.quiet}; margin-bottom: 12px; font-weight: 600;
      }
      .pm-timeline-list {
        display: flex; flex-direction: column; gap: 10px;
      }
      .pm-timeline-item {
        display: flex; gap: 10px; align-items: flex-start;
      }
      .pm-timeline-dot-wrapper {
        display: flex; flex-direction: column; align-items: center;
        align-self: stretch; width: 8px;
      }
      .pm-timeline-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--ok); margin-top: 5px;
        box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
      }
      body.pm-light-mode .pm-timeline-dot {
        background: #10b981;
        box-shadow: none;
      }
      .pm-timeline-line {
        width: 1px; flex: 1; background: var(--b1);
        margin-top: 4px; margin-bottom: -10px;
      }
      .pm-timeline-content {
        display: flex; align-items: center; gap: 8px; font-size: 12.5px; line-height: 1.3;
      }
      .pm-timeline-time {
        color: ${tokens.text.primary}; font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
      .pm-timeline-desc {
        color: ${tokens.text.quiet};
      }
      .pm-timeline-empty {
        font-size: 12px; color: ${tokens.text.quiet}; font-style: italic; line-height: 1.4;
      }

      .pm-interactive-slot {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 52px;
      }
      .pm-quote-container {
        display: flex; flex-direction: column; align-items: center;
        text-align: center; max-width: 340px;
      }
      .pm-quote-text {
        font-family: Georgia, serif; font-style: italic; font-size: 13.5px;
        line-height: 1.45; color: ${tokens.text.quiet}; margin: 0 0 6px 0;
      }
      .pm-quote-author {
        font-family: ${tokens.font.body}; font-size: 10.5px; font-weight: 500;
        text-transform: uppercase; letter-spacing: 0.05em; color: ${tokens.text.kicker};
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
        background: var(--bg1);
        border: 1px solid var(--b0);
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
      .pm-switch-on { background: var(--ok); border-color: var(--ok); }
      .pm-switch-on .pm-switch-thumb { left: 18px; }
      .pm-switch:focus-visible { outline: 2px solid var(--b3); outline-offset: 2px; }

      .pm-numgrid {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
        margin-top: 14px;
      }
      @media (max-width: 480px) { .pm-numgrid { grid-template-columns: 1fr; } }
      .pm-num {
        display: flex; flex-direction: column; gap: 6px;
        font-family: ${tokens.font.body};
      }
      .pm-num span { font-size: 11.5px; color: ${tokens.text.quiet}; }
      .pm-num input {
        appearance: none; background: var(--bg2);
        border: 1px solid var(--b0);
        border-radius: 8px;
        padding: 8px 10px; color: ${tokens.text.primary};
        font-family: inherit; font-size: 13px;
        font-variant-numeric: tabular-nums;
        outline: none; transition: border-color 160ms;
      }
      .pm-num input:focus { border-color: var(--b3); }

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

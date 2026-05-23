import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from "react-helmet-async";

import { Layout } from "@/components/layout";
import { FeedbackProvider } from "@/components/FeedbackWidget";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// Lazy-loaded routes — keeps TipTap, lowlight, jsPDF, etc. out of the initial bundle.
const Work = lazy(() => import("@/pages/work"));
const Contact = lazy(() => import("@/pages/contact"));
const About = lazy(() => import("@/pages/about"));
const ToolsIndex = lazy(() => import("@/pages/tools/index"));
const WebPConverter = lazy(() => import("@/pages/tools/webp-converter"));
const ClipboardHistory = lazy(() => import("@/pages/tools/clipboard-history"));
const PasteToImage = lazy(() => import("@/pages/tools/paste-to-image"));
const DomainAge = lazy(() => import("@/pages/tools/domain-age"));
const YtThumbnail = lazy(() => import("@/pages/tools/yt-thumbnail"));
const YtSummary = lazy(() => import("@/pages/tools/yt-summary"));
const Notepad = lazy(() => import("@/pages/tools/notepad"));
const Pomodoro = lazy(() => import("@/pages/tools/pomodoro"));

function RouteFallback() {
  return <div aria-hidden="true" style={{ minHeight: "100svh", background: "#0A0C10" }} />;
}

function AppRouter() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/work" component={Work} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/tools" component={ToolsIndex} />

          {/* SEO landing aliases — all render the notepad with route-aware SEO */}
          <Route path="/online-notepad" component={Notepad} />
          <Route path="/notepad" component={Notepad} />
          <Route path="/text-to-pdf" component={Notepad} />
          <Route path="/online-text-editor" component={Notepad} />

          <Route path="/tools/webp-converter" component={WebPConverter} />
          <Route path="/tools/png-to-webp" component={WebPConverter} />
          <Route path="/tools/jpg-to-webp" component={WebPConverter} />
          <Route path="/tools/image-to-webp" component={WebPConverter} />
          <Route path="/png-to-webp" component={WebPConverter} />
          <Route path="/tools/clipboard-history" component={ClipboardHistory} />
          <Route path="/tools/clipboard-history-saver" component={ClipboardHistory} />
          <Route path="/tools/clipboard-manager" component={ClipboardHistory} />
          <Route path="/tools/snippet-manager" component={ClipboardHistory} />
          <Route path="/clipboard-history" component={ClipboardHistory} />
          <Route path="/tools/paste-to-download-image" component={PasteToImage} />
          <Route path="/tools/paste-to-image" component={PasteToImage} />
          <Route path="/tools/screenshot-editor" component={PasteToImage} />
          <Route path="/tools/clipboard-to-image" component={PasteToImage} />
          <Route path="/paste-to-image" component={PasteToImage} />
          <Route path="/tools/domain-age-checker" component={DomainAge} />
          <Route path="/tools/domain-age" component={DomainAge} />
          <Route path="/tools/whois-lookup" component={DomainAge} />
          <Route path="/tools/how-old-is-this-domain" component={DomainAge} />
          <Route path="/domain-age-checker" component={DomainAge} />
          <Route path="/tools/yt-thumbnail-downloader" component={YtThumbnail} />
          <Route path="/tools/youtube-thumbnail-downloader" component={YtThumbnail} />
          <Route path="/tools/youtube-thumbnail-grabber" component={YtThumbnail} />
          <Route path="/tools/yt-thumbnail" component={YtThumbnail} />
          <Route path="/youtube-thumbnail-downloader" component={YtThumbnail} />
          <Route path="/tools/youtube-summary" component={YtSummary} />
          <Route path="/tools/yt-summary" component={YtSummary} />
          <Route path="/tools/yt-video-summary" component={YtSummary} />
          <Route path="/tools/youtube-transcript-summarizer" component={YtSummary} />
          <Route path="/tools/video-to-summary" component={YtSummary} />
          <Route path="/youtube-summary" component={YtSummary} />
          <Route path="/tools/notepad" component={Notepad} />
          <Route path="/tools/pomodoro" component={Pomodoro} />
          <Route path="/tools/pomodoro-timer" component={Pomodoro} />
          <Route path="/tools/focus-timer" component={Pomodoro} />
          <Route path="/tools/study-timer" component={Pomodoro} />
          <Route path="/pomodoro" component={Pomodoro} />

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    // Smooth scroll is desktop-only — Lenis on mobile causes jank and disables
    // the iOS rubber-band, hurting perceived performance. Skip touch devices.
    const isCoarse = typeof window !== "undefined" &&
      window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
    const prefersReducedMotion = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (isCoarse || prefersReducedMotion) return;

    let cancelled = false;
    let rafId: number;
    let lenis: { destroy(): void } | null = null;

    // Code-split Lenis so mobile/SSR users never download it.
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const instance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 0.8,
        touchMultiplier: 1.5,
      });
      lenis = instance;
      (window as any).__lenis = instance;
      const raf = (time: number) => {
        instance.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }).catch(() => { /* graceful no-op if chunk fails */ });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      (window as any).__lenis = null;
      lenis?.destroy();
    };
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <FeedbackProvider>
            <AppRouter />
          </FeedbackProvider>
          <Toaster />
        </WouterRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

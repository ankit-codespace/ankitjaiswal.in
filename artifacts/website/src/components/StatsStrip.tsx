import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 200, suffix: "M+", label: "Total Impressions" },
  { value: 5, suffix: "M+", label: "Organic Clicks" },
  { value: 11.5, suffix: "%", label: "Peak CTR" },
  { value: 70, suffix: "+", label: "Websites Built" },
];

function CountUpNumber({ value, suffix, isInView }: { value: number; suffix: string; isInView: boolean }) {
  const [count, setCount] = useState(0);
  const duration = 1200;
  const isDecimal = value % 1 !== 0;

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = easeOutQuart * value;
      setCount(isDecimal ? Math.round(currentValue * 10) / 10 : Math.floor(currentValue));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, isDecimal]);

  return (
    <span className="tabular-nums">
      {isDecimal ? count.toFixed(1) : count}{suffix}
    </span>
  );
}

export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  function scrollToNext() {
    const target = document.getElementById("results") as HTMLElement | null;
    if (!target) return;
    const lenis = (window as any).__lenis;
    if (lenis) {
      lenis.scrollTo(target, { offset: 0, duration: 1.4, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    } else {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <section
      ref={sectionRef}
      className="relative stats-strip-section"
      style={{ background: "#0D1117", display: "flex", flexDirection: "column", justifyContent: "center" }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "420px",
            background: "radial-gradient(ellipse at center, rgba(37,99,235,0.09) 0%, rgba(37,99,235,0.04) 50%, transparent 72%)",
            filter: "blur(50px)",
            zIndex: 0,
          }}
        />
      </div>

      <div
        className="relative z-10 mx-auto max-w-7xl stats-strip-grid"
      >
        {/* LEFT — editorial copy */}
        <motion.div
          className="stats-strip-copy"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#2563eb",
              textTransform: "uppercase",
              marginBottom: "16px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Verified Results
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
              marginBottom: "16px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Numbers that{" "}
            <em
              style={{
                fontFamily: "'Times New Roman', 'Georgia', serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              don't lie.
            </em>
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "#9CA3AF",
              lineHeight: 1.6,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Real data from live websites. No vanity metrics. No inflated claims.
          </p>
        </motion.div>

        {/* RIGHT — 2×2 stats grid */}
        <div
          ref={ref}
          data-testid="stats-grid"
          className="stats-strip-numbers"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: idx * 0.1 }}
              data-testid={`stat-item-${idx}`}
              className="stats-strip-cell"
              style={{
                padding: "32px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                borderRight: idx % 2 === 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <div
                className="tabular-nums"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(36px, 8vw, 66px)",
                  background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.78) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  textShadow: "0 0 40px rgba(59,130,246,0.18)",
                }}
              >
                <CountUpNumber value={stat.value} suffix={stat.suffix} isInView={isInView} />
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "8px",
                }}
              >
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "36px",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
        }}
      >
        <motion.button
          onClick={scrollToNext}
          aria-label="Scroll to next section"
          style={{
            fontSize: "22px",
            color: "rgba(255,255,255,0.35)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "32px 60px",
            userSelect: "none",
            lineHeight: 1,
          }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ color: "#ffffff", scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
        >
          ↓
        </motion.button>
      </div>
    </section>
  );
}

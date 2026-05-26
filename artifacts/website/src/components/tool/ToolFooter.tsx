import { Link } from "wouter";
import { SITE } from "@/lib/site";
import { GitHubIcon, LinkedInIcon, XIcon, ThreadsIcon } from "./social-icons";

export type ToolFooterLink = { href: string; label: string };

export function ToolFooter({ nav }: { nav?: ToolFooterLink[] }) {
  return (
    <footer className="tool-footer">
      <div
        className="tool-footer-inner"
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "40px",
          fontSize: 13.5,
          color: "var(--t2)",
        }}
      >
        {/* Column 1: Core Tools */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--t3)" }}>
            Core Tools
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/tools/webp-converter" className="tool-footer-link">WebP Converter</Link>
            <Link href="/tools/paste-to-image" className="tool-footer-link">Paste to Image</Link>
            <Link href="/tools/pomodoro" className="tool-footer-link">Pomodoro Timer</Link>
            <Link href="/online-notepad" className="tool-footer-link">Online Notepad</Link>
            <Link href="/tools/clipboard-history" className="tool-footer-link">Clipboard History</Link>
          </nav>
        </div>

        {/* Column 2: Resources */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--t3)" }}>
            Resources
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/" className="tool-footer-link">Home</Link>
            <Link href="/work" className="tool-footer-link">Work Portfolio</Link>
            <Link href="/about" className="tool-footer-link">About Ankit</Link>
            <a href="https://github.com/ankit-codespace/ankitjaiswal.in" target="_blank" rel="noopener noreferrer" className="tool-footer-link">
              GitHub Repository
            </a>
          </nav>
        </div>

        {/* Column 3: Connect & Bio */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--t3)" }}>
            Built by Ankit Jaiswal
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--t3)", margin: 0 }}>
            Free browser-based tools for builders. No accounts, no cookie banners, zero tracking scripts.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href={SITE.social.github} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on GitHub" title="GitHub — see the code">
              <GitHubIcon size={17} />
            </a>
            <a href={SITE.social.linkedin} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on LinkedIn" title="LinkedIn — connect with Ankit">
              <LinkedInIcon size={17} />
            </a>
            <a href={`https://x.com/${SITE.twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on X (Twitter)" title="X — follow Ankit">
              <XIcon size={15} />
            </a>
            <a href={SITE.social.threads} target="_blank" rel="noopener noreferrer me author" className="tool-social-link" aria-label="Ankit Jaiswal on Threads" title="Threads — follow Ankit">
              <ThreadsIcon size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

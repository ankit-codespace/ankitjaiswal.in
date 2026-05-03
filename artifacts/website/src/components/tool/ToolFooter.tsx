import { Link } from "wouter";
import { SITE } from "@/lib/site";
import { GitHubIcon, LinkedInIcon, XIcon, ThreadsIcon } from "./social-icons";

/**
 * Standardized dark footer band used at the bottom of every tool page.
 *
 * Matches the notepad's social-proof + nav strip so the entire suite feels
 * like one coherent product. Visible social icons reinforce the JSON-LD
 * Person.sameAs entity graph for AI-citation engines.
 *
 * The right-side nav defaults to the most-trafficked pages but can be
 * overridden per page if a tool wants to surface bespoke internal links.
 */

export type ToolFooterLink = { href: string; label: string };

const DEFAULT_NAV: ToolFooterLink[] = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/tools", label: "Tools" },
  { href: "/online-notepad", label: "Online Notepad" },
  { href: "/text-to-pdf", label: "Text to PDF" },
];

export function ToolFooter({ nav = DEFAULT_NAV }: { nav?: ToolFooterLink[] }) {
  return (
    <footer
      style={{
        background: "#0A0C10",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 24px 56px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          fontSize: 13,
          color: "rgba(255,255,255,0.42)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            Built by{" "}
            <Link href="/" className="tool-footer-link" style={{ fontWeight: 500 }}>
              Ankit Jaiswal
            </Link>
            . Free to use. No account required.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
        <nav style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          {nav.map((l) => (
            <Link key={l.href} href={l.href} className="tool-footer-link">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

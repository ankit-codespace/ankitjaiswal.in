export const SITE = {
  url: "https://ankitjaiswal.in",
  name: "Ankit Jaiswal",
  brand: "Ankit Jaiswal Tools",
  twitter: "@itsankitjaiswal",
  defaultOg: "/opengraph.jpg",
  // Real photo of Ankit — used for avatar UI and as Person.image in JSON-LD
  // so search engines and AI engines have a face to attach to the entity.
  avatar: "/images/hero-portrait.webp",
  locale: "en_US",
  social: {
    github:   "https://github.com/ankit-codespace",
    linkedin: "https://www.linkedin.com/in/itsankitjaiswal/",
    threads:  "https://www.threads.net/@ankitjaiswal.ig",
  },
} as const;

// Profiles that prove "Ankit Jaiswal the entity" across the open web.
// Used in JSON-LD Person.sameAs to give Google / Bing / AI search engines
// an entity-graph signal connecting this site to its author. This is the
// single most important authority signal beyond the visible site itself.
export const PERSON_SAME_AS: string[] = [
  SITE.social.github,
  SITE.social.linkedin,
  SITE.social.threads,
  `https://x.com/${SITE.twitter.replace(/^@/, "")}`,
];

export function absUrl(path: string): string {
  if (!path) return SITE.url;
  if (/^https?:\/\//i.test(path)) return path;
  return SITE.url + (path.startsWith("/") ? path : "/" + path);
}

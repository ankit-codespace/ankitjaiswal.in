import { SITE, PERSON_SAME_AS, absUrl } from "@/lib/site";
import type { ToolFAQItem } from "./ToolSEOArticle";

/**
 * JSON-LD helpers for tool pages.
 *
 * The notepad has hand-tuned schema; these helpers give every other tool
 * the same quality of structured data with one function call. Pass the
 * result(s) into <Seo jsonLd={[…]} />.
 *
 * Why every tool gets a Person + SoftwareApplication + BreadcrumbList:
 *   - Person.sameAs is what proves "Ankit Jaiswal" is a real entity to
 *     Google's Knowledge Graph and to AI search engines.
 *   - SoftwareApplication is how Google understands "this URL is a tool"
 *     vs an article — drives rich results in some SERPs.
 *   - BreadcrumbList helps Google rebuild the site hierarchy and shows
 *     breadcrumbs in search results.
 *   - FAQPage (optional) catches the "People Also Ask" SERP feature and
 *     is the single highest-leverage block for getting cited by ChatGPT,
 *     Perplexity, and Bing Copilot.
 */

export interface BuildToolJsonLdInput {
  /** Tool name as it should appear in schema (e.g. "WebP Converter"). */
  name: string;
  /** One-paragraph description, ~155 chars or fewer. */
  description: string;
  /** Path on the site, e.g. "/tools/webp-converter". */
  path: string;
  /** Breadcrumb label shown in SERPs. Usually same as name. */
  breadcrumbName?: string;
  /** ApplicationCategory, e.g. "MultimediaApplication" — see schema.org. */
  category?: string;
  /** Optional FAQ items — if provided, FAQPage schema is appended. */
  faqs?: ToolFAQItem[];
  /** Optional aggregate rating to surface stars in SERPs (use carefully). */
  rating?: { value: number; count: number };
}

export function buildToolJsonLd(input: BuildToolJsonLdInput): object[] {
  const url = absUrl(input.path);
  const author = {
    "@type": "Person",
    "@id": `${SITE.url}/#person`,
    name: SITE.name,
    url: SITE.url,
    image: SITE.avatar,
    sameAs: PERSON_SAME_AS,
  };

  const software: any = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url,
    applicationCategory: input.category ?? "UtilitiesApplication",
    operatingSystem: "Any (web browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author,
    publisher: author,
  };
  if (input.rating) {
    software.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating.value,
      ratingCount: input.rating.count,
    };
  }

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Tools", item: absUrl("/tools") },
      { "@type": "ListItem", position: 3, name: input.breadcrumbName ?? input.name, item: url },
    ],
  };

  const out: object[] = [software, breadcrumbs];

  if (input.faqs && input.faqs.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: input.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return out;
}

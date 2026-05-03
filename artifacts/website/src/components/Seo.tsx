import { Helmet } from "react-helmet-async";
import { SITE, absUrl } from "@/lib/site";

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  /** Override canonical URL (e.g. to consolidate keyword-alias routes). Falls back to `path`. */
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  jsonLd?: object | object[];
  keywords?: string;
}

export function Seo({
  title,
  description,
  path,
  canonicalPath,
  image,
  type = "website",
  noIndex = false,
  jsonLd,
  keywords,
}: SeoProps) {
  const canonical = absUrl(canonicalPath ?? path);
  const ogImage = absUrl(image ?? SITE.defaultOg);
  const fullTitle = title.includes(SITE.name) || title.includes(SITE.brand)
    ? title
    : `${title} | ${SITE.brand}`;
  const ldArr = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE.brand} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {SITE.twitter && <meta name="twitter:creator" content={SITE.twitter} />}

      {ldArr.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}

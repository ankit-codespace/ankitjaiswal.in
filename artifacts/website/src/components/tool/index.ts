/**
 * Tool design system — barrel export.
 *
 * One import path for everything you need to build a notepad-quality tool
 * page. Usage example for a brand-new tool:
 *
 *   import {
 *     ToolPage, ToolSEOArticle, ToolSection, SectionHeading,
 *     ToolFAQ, ToolHowToSteps, ToolFeatureGrid,
 *     ToolRelatedTools, ToolAuthorCard, ToolPrivacyBand,
 *     buildToolJsonLd, FeedbackInlineCard,
 *   } from "@/components/tool";
 *
 *   export default function MyTool() {
 *     const faqs = [{ q: "...", a: "..." }];
 *     return (
 *       <ToolPage
 *         seoTitle="..." seoDescription="..." seoPath="/tools/my-tool"
 *         seoJsonLd={buildToolJsonLd({ name: "...", description: "...", path: "...", faqs })}
 *         title="My Tool" tagline="Short pitch"
 *       >
 *         <main>{ /* the actual interactive UI * / }</main>
 *         <ToolSEOArticle h1="..." intro="..." metaLine={ /* ... * / }>
 *           <ToolSection><SectionHeading kicker="Features" title="..." /><ToolFeatureGrid items={...} /></ToolSection>
 *           ...
 *         </ToolSEOArticle>
 *       </ToolPage>
 *     );
 *   }
 */

export { ToolPage } from "./ToolPage";
export { ToolHeader } from "./ToolHeader";
export { ToolFooter, type ToolFooterLink } from "./ToolFooter";
export { ToolStyles } from "./ToolStyles";
export {
  ToolStatusBar,
  TOOL_STATUS_BAR_PADDING,
  type ToolStatusStat,
  type ToolShortcut,
  type ToolShortcutGroup,
} from "./ToolStatusBar";
export {
  ToolSEOArticle,
  ToolSection,
  SectionHeading,
  ToolFAQ,
  buildFAQJsonLd,
  ToolRelatedTools,
  ToolAuthorCard,
  ToolPrivacyBand,
  ToolHowToSteps,
  ToolFeatureGrid,
  type ToolFAQItem,
  type RelatedTool,
  type ToolHowToStep,
  type ToolFeature,
} from "./ToolSEOArticle";
export { buildToolJsonLd, type BuildToolJsonLdInput } from "./jsonld";
export { GitHubIcon, LinkedInIcon, XIcon, ThreadsIcon, AtSignIcon } from "./social-icons";
export { tokens, FOOTER_BAND_PADDING } from "./tokens";
// Re-export the feedback bits so a single import gives you everything.
export { FeedbackInlineCard, FeedbackHeaderButton, useFeedback } from "@/components/FeedbackWidget";

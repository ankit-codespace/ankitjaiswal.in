# ankitjaiswal.in — Design System & Design DNA v1.1
**Status: LOCKED**
Applies to: Every page, tool, SaaS interface, landing page, blog, and product built under ankitjaiswal.in

---

## How to Use This Document

Hand this file to any developer, AI agent, or contractor before they write a single line.
They implement every rule exactly as written. No substitution. No interpretation.
When a situation is not explicitly covered, apply the **design philosophy** — not personal preference.

**What this document does not contain:** component-level code snippets.
A developer who understands this system will write better components than anything copy-pasted.
The only code in this document is the CSS token block — because tokens are vocabulary, not implementation.

---

## 1. Design Philosophy

**One sentence:** Confidence through restraint.

Every element earns its place by communicating something real.
Color is not decoration — it carries meaning.
Animation is not style — it confirms action.
Typography variation is not flair — it creates hierarchy.

The goal is a product that reads as built by people who had better things to do than chase trends.
That restraint is what makes it premium.

**Three principles that override all other decisions:**

1. If a design element is doing a job, keep it. If it is performing, remove it.
2. Monochrome first. Add color only when meaning demands it.
3. The static state must be beautiful. Never use motion to compensate for a weak rest design.

**What this system is not:**
It is not a dark mode toggle on a light UI. It is not a developer template. It is not an AI product aesthetic. It has no blue glow, no purple accent, no pulsing indicators, no gradient text. Those patterns have been intentionally excluded.

---

## 2. Color System

### 2.1 Palette Philosophy

This palette is **warm-neutral dark**. Zero blue cast. In every surface hex value, the red channel is equal to or greater than the blue channel. This is the single most important rule in the entire system — it is what separates this palette from every generic "dark mode" SaaS template.

The human eye reads a dark background with a higher blue channel as cool, clinical, and digital. The same darkness with a warm tilt reads as deliberate, crafted, and premium. The difference between `#1A1A1E` (blue-tinted) and `#1A1A1A` (neutral) and `#1A1A18` (warm) is invisible at a glance — but felt immediately.

### 2.2 Surface Tokens

Think of these as physical depth. Surfaces closer to the viewer are lighter. The page floor is the darkest.

| Token | Hex | Usage |
|---|---|---|
| `--bg0` | `#0F0F0E` | Page base. Body background. The floor. |
| `--bg1` | `#161615` | Cards, panels, containers, drop zones |
| `--bg2` | `#1C1C1B` | Card headers, elevated rows, active surfaces |
| `--bg3` | `#222221` | Secondary buttons, icon boxes, tag backgrounds |
| `--bg4` | `#282826` | Hover state for `--bg3` elements |

**Rule:** Never skip a level. `--bg2` never sits directly on `--bg0`. The stacking tells users what is structural and what is interactive. Depth is meaning.

**Rule:** Never use pure `#000000` black. It reads as flat on modern displays. `--bg0` is the correct floor.

### 2.3 Border Tokens

| Token | Hex | Usage |
|---|---|---|
| `--b0` | `#252523` | Dividers, section separators, card outer borders at rest |
| `--b1` | `#2E2E2C` | Component borders at rest — buttons, inputs, panels |
| `--b2` | `#3A3A37` | Interactive surface borders at rest — drop zones, large hit areas |
| `--b3` | `#4A4A46` | Hover state borders on interactive surfaces |

**Rule:** All borders are `1px solid`. Never `2px`. Never `0px` on interactive elements.

**Rule:** Drop zones and large interactive areas use `--b2` at rest (not `--b1`). The slightly brighter border makes the interactive zone perceivable without being dramatic. If a user cannot find the drop zone, the border was too weak.

### 2.4 Typography Color Tokens

Four levels. These represent importance, not decoration.

| Token | Hex | Meaning |
|---|---|---|
| `--t1` | `#F0EDE8` | Primary. Headings, key data values, active text. |
| `--t2` | `#A5A29B` | Secondary. Descriptions, placeholders, hover transitions. |
| `--t3` | `#7A7874` | Muted. Labels, column headers, eyebrows, quiet hints. |
| `--t4` | `#4A4944` | Ghost. Near-invisible at rest. Format indicators, decorative meta only. |

**The hierarchy rule:** Use the correct level every time. A column header is `--t3`, not `--t1`. A file size value is `--t1`, not `--t2`. If everything is `--t1`, nothing is primary. The tonal difference between levels is the entire information architecture.

### 2.5 Accent Token

| Token | Value | Rule |
|---|---|---|
| `--ac` | `#FFFFFF` | Pure white. One primary CTA per view. Never used twice on the same screen. |

The primary CTA button is white. Full stop. This is the only place `--ac` appears. The moment white appears in two elements on the same screen, neither element commands attention. This is not a guideline — it is a system constraint.

### 2.6 Hero Highlight Token

| Token | Hex | Rule |
|---|---|---|
| `--hi` | `#EDE8DF` | Warm cream. Hero headings only. The `<em>` italic moment. Do not use elsewhere. |

`--hi` is a layout-specific token. It exists for one purpose: the Times New Roman italic word in a hero heading. It is slightly warmer and slightly brighter than `--t1`, creating a micro-separation that makes the editorial serif pop without color. If you want to use `--hi` outside a hero, use `--t1` instead.

### 2.7 Semantic Color Tokens

These colors carry fixed, universal meanings. They are never used decoratively.

| Token | Hex | Meaning | Correct Use |
|---|---|---|---|
| `--ok` | `#52C47A` | Success, safe, improved, confirmed | Conversion success, positive result values, "done" states |
| `--ok2` | `rgba(82,196,122,0.07)` | Success background tint | Badge fill behind green text only |
| `--warn` | `#C8863A` | Warning, degraded, attention | Negative result, caution states, values that worsened |
| `--err` | `#C4483E` | Error, failure, destructive | Toast errors, failed states, destructive confirmation |

**Green rule:** Green is earned. It appears only when something has genuinely succeeded or been confirmed safe. A privacy indicator does not use a green dot — it uses a static lock icon. A "local processing" badge does not pulse green — the word "local" carries the meaning. Reserve `--ok` for data-confirmed success states.

### 2.8 Forbidden Colors

The following are explicitly prohibited in this system. Any implementation using these must be revised.

- Any **purple, indigo, or violet** — this is the most overused accent in SaaS tooling (2022–2025). It reads as "AI product template" immediately.
- Any **blue with B > R** in the hex value as a background or accent
- Any hex where the blue channel is the dominant value — breaks the warm-neutral palette
- `#3ECF8E` — this is Supabase's brand green and reads as a copied template
- `#6B5FED` and variants — widely used indie SaaS accent, now a genre marker
- Pure `#FFFFFF` anywhere except the primary CTA button and its hover state
- Pure `#000000` — use `--bg0` instead

---

## 3. Typography System

### 3.1 The Three Fonts

This system uses exactly three typefaces. Not four. Not two. Three — each with a distinct, exclusive role.

```
Sora        → Display / Headings only
Inter       → Everything else (body, UI, labels, buttons, values, meta)
Times New Roman → Editorial italic highlight only
```

**Google Fonts import — copy verbatim into every `<head>`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

Times New Roman is a system font — no import required.

**CSS font variables:**
```css
--d:   'Sora', sans-serif;
--s:   'Inter', sans-serif;
--tnr: 'Times New Roman', Times, serif;
```

---

### 3.2 Sora — Display / Headings

**Role:** Page titles, section headings, component headings, hero text. Nothing else.

**Weights used:** 700 for section/component headings. 800 for hero h1 only.

**Never use Sora for:** body copy, labels, buttons, descriptions, metadata, navigation, footers, or any text that runs longer than one line of heading.

**The reason this rule exists:** Sora is a geometric display font. At large sizes it is distinctive and architectural. At 12px in a paragraph it becomes illegible and jarring. The system's identity depends on Sora being rare — it only appears when you need architectural weight.

---

### 3.3 Inter — Body, UI, Labels, Values

**Role:** Everything that is not a heading and not an editorial italic moment.

This includes: paragraphs, button text, navigation, labels, column headers, metadata, eyebrows, file names, values, error messages, footer text, keyboard shortcuts, version tags, status text, placeholder text, hint text.

**Weights used:**
- 300 — light body paragraphs, secondary descriptions
- 400 — default body, regular UI text
- 500 — UI labels, secondary button text, medium emphasis
- 600 — primary button text only

**Letter-spacing by context** (do not skip this — it changes everything at small sizes):

| Context | Letter-spacing | Why |
|---|---|---|
| Body paragraph (14px+) | `0.01em` | Slight open — easier reading for multi-line |
| Button text | `0.005em` | Barely open — improves small size readability |
| Uppercase labels / eyebrows | `0.12em` to `0.16em` | Uppercase Inter needs significant air to breathe |
| Uppercase column headers | `0.10em` | Slightly less than eyebrows — still open |
| Data values (numbers) | `-0.01em` to `-0.02em` | Numbers read better slightly tight |
| Version tags / badges | `0.05em` | Small, slightly open |
| Navigation / footer meta | `0.01em` | Neutral |

**Line-height by context:**

| Context | Line-height |
|---|---|
| Body paragraphs | `1.65` |
| Long-form content / blog | `1.75` |
| UI labels (single line) | `1` or `normal` |
| Button text | `1` |
| Card values / data | `1.1` to `1.2` |

### 3.4 Times New Roman — Editorial Italic

**Role:** The typographic rupture. Breaks the geometric rhythm of Sora or Inter to highlight a key word, add emphasis, or create an aggressively beautiful visual contrast.

**Rules & Applications:**
1. **Hero Headings:** A single, prominent word within the main hero title is styled in Times New Roman italic.
   - **Size:** At minimum 40% larger than the surrounding text.
   - **Color:** `--hi` (warm cream `#EDE8DF`).
   - **Optical Alignment:** Requires `display: inline-block` and a negative `vertical-align` value (approximately `-0.08em`) to align the baseline optically.
2. **Inline Highlights (Body & Section Copy):** Can be used inline within body paragraphs or description text as a support style to highlight critical concept words, names, or brand terms.
   - **Style:** Always italicized (`font-style: italic`), using font-family `var(--tnr)`.
   - **Size:** Inherits the parent element's text size (e.g., within `p` it stays the standard paragraph size).
   - **Color:** Either `--hi` (warm cream) or `--t1` depending on readability contrast.

**The purpose:** Sora/Inter are highly structured geometric typefaces. Times New Roman italic is calligraphic, classical, and organic. Their juxtaposition creates an editorial tension that makes the brand feel premium, intentional, and aggressively beautiful.

---

### 3.5 Type Scale

Fixed scale. Do not create values between these.

| Size | Typical use |
|---|---|
| 9px | Nano labels — column headers, format indicators (PNG, JPG) |
| 10px | Eyebrows, meta, keyboard hints, version tags |
| 11px | Secondary UI text, navigation mono, toast messages |
| 12px | Button text, filenames, card row text |
| 13px | Primary body Inter, header tool name, quality values |
| 14px | Comfortable body — landing pages, descriptions |
| 15px | Component headings — "Drop files here", sub-section titles |
| 18px | Section headings on full pages |
| 24px | Sub-hero headings, feature section titles |
| 32px | Hero h1 (Sora 800) — tool pages and tight layouts |
| 40px–48px | Hero h1 (Sora 800) — landing pages, marketing pages |
| 46px+ | Hero em italic (Times New Roman) — always relative to h1 size |

For landing pages and marketing content, the hero can scale up to 48px–56px Sora. The italic em should scale proportionally to remain at least 40% larger.

---

### 3.6 Heading Hierarchy

For any page or tool, follow this heading structure:

- **Eyebrow** (above h1): Inter, 10px, 500 weight, `--t3`, uppercase, `letter-spacing: .14em`
- **h1**: Sora, 32–48px, 800 weight, `--t1`, `letter-spacing: -.04em`
- **h1 em** (editorial word): Times New Roman, italic, 40%+ larger, `--hi`
- **h2 / Section title**: Sora, 18–24px, 700 weight, `--t1`, `letter-spacing: -.03em`
- **h3 / Component heading**: Sora, 15px, 700 weight, `--t1`, `letter-spacing: -.025em`
- **Body**: Inter, 13–14px, 300–400 weight, `--t2` for secondary, `--t1` for primary
- **Label / Column header**: Inter, 9–10px, 500 weight, `--t3`, uppercase, tracked

---

## 4. Spacing & Layout

### 4.1 Base Grid
All spacing follows an **8px base grid**. Every padding, gap, and margin value is a multiple of 4px minimum, 8px preferred.

Common values in use: `4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 64 · 80 · 96`

### 4.2 Page Layout Principles

This system works for three broad page types:

**Tool Page** — narrow, task-focused
- Max content width: 640px, centered
- Generous vertical padding: 44px top, 52px bottom
- One task, one CTA, no distractions

**Landing / Marketing Page** — wide, persuasion-focused
- Max content width: 1080px to 1200px, centered
- Section padding: 80px to 120px vertical
- Multiple sections, but one primary CTA per section

**Dashboard / App Page** — structural, data-focused
- Grid-based layout, sidebar optional
- Cards and panels use the depth stack (bg0 → bg1 → bg2)
- Data density is acceptable — the type scale handles it

**Universal rules for all page types:**
- Content never touches the viewport edge — minimum 24px horizontal margin on mobile, 40px+ on desktop
- Never center-align body paragraphs longer than 2 lines — left-aligned reads faster
- Hero text is center-aligned. All body content below the hero is left-aligned.
- Max line length for body text: 68–72 characters (approximately 600–680px at 14px Inter)

### 4.3 Border Radius

Three values. Do not create others.

| Token | Value | Used for |
|---|---|---|
| `--r` | `10px` | Cards, panels, containers, drop zones, modals |
| `--rs` | `7px` | Buttons, inputs, small interactive elements, toasts |
| `--rs-xs` | `4px` | Badges, tags, pills, version labels |

**Rule:** Never exceed `12px` for any radius. Above `12px` reads as consumer mobile app, not premium tool. For inner elements inside a container: `calc(var(--r) - 1px)` to prevent visual overflow.

---

## 5. Component Rules

These are principles, not templates. A developer reading this builds the component — not copies it.

### 5.1 Header / Navigation

Every page has a top navigation bar with:
- Left: back/home navigation + breadcrumb or tool name
- Right: one small contextual badge (privacy status, account, etc.)
- Border: `1px solid --b0` bottom separator
- Background: inherits `--bg0` — headers are never a different surface color than the page
- Height: content-driven (no fixed height)
- No drop shadow on the header — the bottom border is sufficient separation

Navigation text uses Inter, `--t3` at rest, `--t2` on hover. Never `--t1` for navigation — primary text is reserved for content.

### 5.2 Buttons

Three levels. One primary CTA per view maximum. This is the hierarchy:

**Primary (`btn-pri`):** White background (`--t1`), near-black text (`#0D0D0C`), Inter 600, 12px. Hover goes to pure white (`--ac`). Used once per view for the single most important action.

**Secondary (`btn-sec`):** `--bg3` background, `--t2` text, `1px solid --b1` border. Hover: `--bg4` background, `--b2` border, `--t1` text. Used for supporting actions that live near the primary.

**Ghost (`btn-ghost`):** Transparent background, `--t3` text, `1px solid --b0` border. Hover: `--b1` border, `--t2` text. Used for dismiss, cancel, or low-priority actions only.

All buttons: `padding: 7px 14px`, `border-radius: --rs`, `font-size: 12px`, `font-weight: 500` (600 for primary), `transition: .14s`.

### 5.3 Cards and Panels

Cards use `--bg1` surface, `1px solid --b0` border, `--r` radius. Card headers (if present) use `--bg2` to lift them one level above the card body.

On hover, cards respond with border brightening to `--b1` — not shadow, not lift. The border step is the hover signal.

Cards never have drop shadows. Depth is communicated by surface color, not shadow. If you feel the card needs a shadow to stand out, the background behind it is the wrong surface token.

### 5.4 Forms and Inputs

Text inputs: `--bg1` background, `1px solid --b1` border, `--r` or `--rs` radius, `--t1` text, `--t3` placeholder.
On focus: border brightens to `--b3`. Never a colored border on focus — the white outline focus ring handles keyboard states.

Labels: Inter, 10px, 500 weight, `--t3`, uppercase, `letter-spacing: .10em`. Labels are above inputs, never inside.

Range/slider: 2px track, `--b1` unfilled, `--t1` filled (via JS linear gradient). Thumb is 12px circle, `--t1`, with `2px solid --bg0` inset border. Thumb scales `1.25x` on hover.

### 5.5 Badges and Tags

Data badges (compression %, status): Inter, 10px, `--rs-xs` radius, `padding: 2px 7px`.
- Success: `--ok2` background, `--ok` text, `1px solid rgba(82,196,122,.14)` border
- Warning: equivalent warm tint, `--warn` text
- Neutral/version: `--bg3` background, `--t3` text, `1px solid --b1`

### 5.6 Status Indicators

**Use a static icon, not a pulsing dot.**

The pulsing/blinking dot is the most overused micro-pattern in developer tooling (2023–2025). It reads as "AI product" immediately. A static lock icon communicates "secure/local" with zero trend baggage and universal recognition. A static checkmark communicates "done." A static circle communicates "status." None of them need to blink.

**Rule:** No `animation` property on status indicators. If the status changes, update the icon or color — do not animate the indicator itself.

### 5.7 Error / Notification Toast

Fixed position, bottom center. Slides up from below on appearance, slides down on dismiss. Background `--bg3`, error text `--err`, error-tinted border. Font: Inter, 11px. Auto-dismisses after 3 seconds. Never more than one toast visible at a time.

### 5.8 Loading States

The only allowed loading animation is a simple spinner ring: a circle with one arc in `--t1`, the rest in `--b2`, rotating continuously at `.8s linear`. Functional, minimal, universally understood.

No skeleton loaders with shimmer effects. No bouncing dots. No pulsing placeholders. If the page needs to communicate loading, the spinner ring is sufficient.

---

## 6. Animation System

### 6.1 The Single Rule

Animation is functional or it does not exist.

A spinner tells you something is processing. A card animating in tells you a result arrived. A border brightening tells you the zone is ready. These earn their existence.

A border spinning in a rainbow gradient tells you the developer wanted it to look impressive. A hero section fading in on page load tells you someone watched too many portfolio site tutorials. These are removed.

### 6.2 Timing Reference

| Duration | Use |
|---|---|
| `.14s` | Button hover, fast component responses |
| `.18s` | Icon hover, input state changes |
| `.20s` | Card border hover |
| `.22s` | Layout-level transitions — drop zone, toast |
| `.30s cubic-bezier(.22,1,.36,1)` | Element entry — result cards, modals appearing |
| `.80s linear infinite` | Loading spinner only |

### 6.3 Explicitly Forbidden Animations

- Spinning gradient borders on any element at any time
- Pulsing, blinking, or opacity-looping status indicators
- Page-load entrance animations on static content (headers, hero text, navigation)
- Hover scale effects on cards or buttons
- Parallax scrolling
- Color animations that loop without user interaction
- Any animation with `animation-duration` above 1 second (except the spinner)
- Transitions on `font-size`, `font-weight`, or `letter-spacing`

---

## 7. Iconography

All icons are SVG, stroke-based. No filled icons. No icon fonts. No emoji — ever.

**Emoji rule:** Emoji are never used in this design system. Not in buttons, not in headings, not in body copy, not in labels, not in tooltips, not in error messages, not in empty states, not anywhere in any interface. Emoji in UI reads as consumer mobile app or AI-generated content. This system is neither. Use a proper SVG icon or use words.

**Icon style:**
- Stroke only, no fill
- Stroke width: `1.3px` to `1.5px`
- Stroke linecap: `round`
- Stroke linejoin: `round`
- Color: always `currentColor` — icons inherit their parent's text color, including hover transitions
- Never hardcode a hex color into an SVG

**Icon sizes:**
- 12×12: button icons, navigation icons, inline icons
- 16×16: standard UI icons — inputs, labels
- 18×18: feature icons in drop zones or cards
- 20–24×24: section icons, empty state icons

---

## 8. Surface Texture

### 8.1 Noise Grain

Apply SVG fractalNoise grain to major interactive surfaces — drop zones, hero panels, large feature cards. This is the difference between a surface that feels crafted and one that looks like a color swatch.

Implementation: `::before` pseudo-element, `opacity: .022`. This value is locked. Not `.04` (visible), not `.01` (ineffective). The exact URI for the noise SVG is included in the CSS token block below.

At this opacity level the grain is invisible consciously but creates material depth that any observer feels without identifying. It is why the surface reads as "designed" rather than "coded."

### 8.2 Warm Spotlight

For large interactive surfaces (drop zones, hero backgrounds), a centered radial gradient from the top emits a barely-there warmth. `rgba(240,237,232,.026)` at center, transparent at 66%. This is not a glow — it is warmth. The distinction is opacity. Above `.04` it becomes a glow. At `.026` it is an ambient quality.

---

## 9. What This System Is Not

These patterns will never appear in any implementation of this design system:

| Pattern | Reason |
|---|---|
| Purple, indigo, or violet accent | Most overused SaaS/AI color category (2022–2025) |
| Blue-dominant dark backgrounds | Reads as "AI tool template" — breaks palette identity |
| Pulsing status dots | Ubiquitous AI product pattern |
| Spinning conic gradient borders | Trend compensation for weak static design |
| Glassmorphism (frosted blur) | Visual noise, trend-chasing |
| Gradient text | Reads as AI-generated UI |
| Box shadows with colored glow | "Midnight CSS" aesthetic — not this system |
| Heavy drop shadows on cards | Depth is communicated by surface tokens, not shadow |
| Border radius above 12px | Consumer mobile aesthetic |
| Emoji in any interface element | Always wrong in this system |
| Hover scale on cards or buttons | Toy-like at this density |
| Page-load entrance animations | Only dynamic content (results, cards) gets entry animation |
| More than one `--ac` (white CTA) per screen | Breaks attention hierarchy |
| Four or more fonts | Three fonts is a system |
| `--hi` token outside hero italic | It exists for one purpose only |

---

## 10. Design System Applicability by Page Type

This system is designed to work across every page type. Here is how the core language adapts:

### Tool Page
Use tight 640px max-width. Single task, single CTA. Drop zone or input as the primary interactive surface. Result cards below. Header and footer are minimal. This is the most constrained use — everything points to one action.

### Landing / Marketing Page
Scale hero typography up (40–48px h1, proportionally larger `<em>`). Increase section vertical padding to 80–120px. Multiple sections are allowed, but each section has at most one primary CTA button. Background stays `--bg0`. Feature cards use `--bg1`. Section dividers use `1px solid --b0`. No full-width colored section backgrounds — the depth scale handles separation.

### Dashboard / App
Introduce a sidebar at `--bg1` on a `--bg0` background, `1px solid --b0` right border. Data tables use `--bg1` card container, `--bg2` header rows, `--b0` row dividers. Values use Inter, not Sora — Sora only appears in page-level headings. Charts and graphs use only semantic tokens (`--ok`, `--warn`, `--err`) and `--t1`/`--t2` for neutral data. No rainbow chart palettes.

### Editorial / Blog
Increase body font to Inter 14–15px, line-height `1.75`. The `<em>` Times New Roman italic is used here too — for pull quotes, chapter titles, or article hero words. Images sit at full content-width with `--r` border-radius and `1px solid --b0` border. No decorative dividers — use whitespace instead.

### Pricing / SaaS Feature Page
Feature cards use `--bg1` on `--bg0`, same as all cards. Pricing tiers: highlighted tier uses `--bg2` (not a colored accent). Never use a colored card to highlight a pricing tier — use the depth step. The single CTA per tier follows the button hierarchy. Trust signals and fine print use Inter, `--t3`, 11–12px.

---

## 11. Checklist Before Shipping

Run through this before any page goes live.

**Color**
- [ ] No surface hex has B > R in the value
- [ ] Exactly one white (`btn-pri`) CTA per view
- [ ] Green (`--ok`) used only for confirmed success states
- [ ] No purple, indigo, blue, or colored accent
- [ ] Background depth follows the `bg0 → bg1 → bg2` stack correctly

**Typography**
- [ ] Only three fonts in use: Sora, Inter, Times New Roman
- [ ] Sora only on headings
- [ ] Times New Roman only on italic `<em>` in hero heading with `--hi` color
- [ ] Uppercase labels have sufficient letter-spacing (`.10em` minimum)
- [ ] Hero italic `<em>` is at least 40% larger than surrounding h1
- [ ] No emoji anywhere

**Interaction**
- [ ] No pulsing, blinking, or looping animations
- [ ] No spinning gradient borders
- [ ] No hover scale on cards or buttons
- [ ] No page-load entrance animations on static elements
- [ ] Drop zone uses `--b2` border at rest (not `--b1`)
- [ ] All hover states use correct token steps

**Accessibility**
- [ ] All interactive elements have `:focus-visible` styles
- [ ] Focus ring uses `2px solid rgba(240,237,232,.18)`, offset `2px`
- [ ] No `outline: none` without a replacement

**Texture and depth**
- [ ] Major interactive surfaces include noise grain at `.022` opacity
- [ ] No heavy drop shadows on cards — border differentiation only
- [ ] No gradient text

---

## 12. CSS Token Block

Copy this into every project as the first thing in your stylesheet. This is the entire design language as code. Build every component on top of it.

```css
:root {
  /* SURFACES — warm-neutral dark, zero blue cast */
  --bg0: #0F0F0E;
  --bg1: #161615;
  --bg2: #1C1C1B;
  --bg3: #222221;
  --bg4: #282826;

  /* BORDERS */
  --b0: #252523;
  --b1: #2E2E2C;
  --b2: #3A3A37;
  --b3: #4A4A46;

  /* TYPOGRAPHY — four levels of importance */
  --t1: #F0EDE8;
  --t2: #7A7874;
  --t3: #3E3E3B;
  --t4: #282826;

  /* ACCENT — one white CTA per view */
  --ac: #FFFFFF;

  /* HERO ITALIC — Times New Roman em only, never elsewhere */
  --hi: #EDE8DF;

  /* SEMANTIC — earned by meaning, never decorative */
  --ok:   #52C47A;
  --ok2:  rgba(82,196,122,0.07);
  --warn: #C8863A;
  --err:  #C4483E;

  /* RADII */
  --r:    10px;
  --rs:    7px;
  --rs-xs: 4px;

  /* FONTS */
  --d:   'Sora', sans-serif;
  --s:   'Inter', sans-serif;
  --tnr: 'Times New Roman', Times, serif;
}

/* RESETS */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: var(--bg0);
  color: var(--t1);
  font-family: var(--s);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* FOCUS STATES — never suppress without replacement */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid rgba(240,237,232,.18);
  outline-offset: 2px;
  border-radius: var(--rs);
}

/* NOISE GRAIN — apply via ::before on interactive surfaces */
/*
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256'
    xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence
    type='fractalNoise' baseFrequency='0.9' numOctaves='4'
    stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25'
    filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  opacity: .022;
*/
```

---

*ankitjaiswal.in Design System v1.1 — LOCKED*
*When in doubt: do less, mean more.*

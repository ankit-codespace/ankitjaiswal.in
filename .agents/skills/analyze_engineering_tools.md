# Skill: Analyze Free Engineering Tools Stage

This skill conducts a deep analysis of the "Free Engineering Tools" interactive component inside `OpenSourceAssets.tsx`.

## Analysis Findings

1. **Target Component**:
   - File: `artifacts/website/src/components/OpenSourceAssets.tsx`
   - Active Component: `GoneManagerCanvas` (lines 928-1090) along with sub-canvases `RecapYtCanvas` and `CloudflarePurgerCanvas`.

2. **Chroma Suffix (Visual Distractions)**:
   - Window dots: uses bright colors (`bg-red-500/60`, etc.) that act as childish OS mockups.
   - Tabs: `Standard 404` and `Optimized 410` buttons use bright red/green glowing fills and borders, which looks cheap and inconsistent.
   - Button: `Crawl Page` has a solid bright neon blue background.
   - Primary metric status: Uses bright percentages (`text-red-400`, `text-green-400`).
   - Download Button: Uses a massive cream block `#EDEAE4` that is visually too heavy and distracting from the code specs.

3. **Restructuring Strategy**:
   - Align the styles to top-1% technology products like Stripe, Supabase, and Vercel.
   - Restrain colors to a clean zinc palette, utilizing small status dots (green/red) instead of full-text coloring.
   - Convert primary CTA buttons inside mock sandboxes to outline frames.

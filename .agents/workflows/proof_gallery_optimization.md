---
description: Optimize the Proof Gallery section scroll performance, remove heavy CSS blurs, window deck cards, and refine noise overlays.
---

# Workflow: Proof Gallery Optimization

## Trigger
User types: `/proof_gallery_optimization`

This workflow runs autonomously to optimize `ProofGallery.tsx` scroll performance, ensuring smooth rendering, reduced CPU paint passes, and efficient memory utilization.

---

## Execution Pipeline

### Step 1 — Run Analysis
Execute skill: `.agents/skills/analyze_proof_gallery.md`

### Step 2 — Run Planning
Execute skill: `.agents/skills/plan_proof_gallery.md`

### Step 3 — Phase 1: Background & Orbs Optimization
- Remove the heavy live blur CSS filter from floating orbs.
- Replace dynamic SVG noise overlay with a static background pattern or optimized representation.

### Step 4 — Phase 2: Stacking Deck Windowing
- Optimize the DOM rendering of the card stack to render only visible cards.

### Step 5 — Verify & Compile
- Run typechecks and build verification checks.

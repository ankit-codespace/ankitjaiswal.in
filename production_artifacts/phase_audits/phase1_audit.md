# Phase 1 Audit: State and Helpers
Status: COMPLETE

## Changes
- Extended `Annotation` interface in `paste-to-image.tsx` to include `textStyle?: "plain" | "highlight" | "solid"`.
- Defined `isLightHex(hex)` to parse 3-digit and 6-digit hex values and compute relative luminance.
- Implemented `drawRoundedRect` canvas API helper to draw rounded rectangle vectors for highlights/fills.

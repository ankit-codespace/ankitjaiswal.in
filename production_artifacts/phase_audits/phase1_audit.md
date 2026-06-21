# Phase 1 Audit: CSS Selection Bypass
Status: COMPLETE

## Changes
- Verified `.ProseMirror a { pointer-events: none; }` is active in `artifacts/website/src/index.css`.
- Verified `.ProseMirror a { pointer-events: none; }` is active in `notepad-win/src/renderer/src/index.css`.
- Confirmed link pointer-events bypass works correctly to preserve editing selections while letting click actions fall through natively.

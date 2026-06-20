# Footer Redesign & Alignment — Build Plan

## Phased Execution Plan

### Phase 1: Brand Footer Structure & Styles
- Modify `layout.tsx` footer container to use a dark background with a bottom radial glow.
- Add a client-facing brand conversion card with a "Work with Me" contact action.

### Phase 2: Live Clock Widget Implementation
- Inject a time state hook (`currentTime`) updating on a 1000ms timer interval.
- Render the local clock display in the India Standard Time (IST) timezone `"Asia/Kolkata"` with a pulsing green indicator.

### Phase 3: Visual Polish & Micro-Animations
- Restructure columns into:
  1. About & Live Clock
  2. Explore (Pages)
  3. Professional Tools
  4. Connect (WhatsApp, Email, LinkedIn)
- Polish all text colors, fonts, hover scaling, and focus rings.

### Phase 4: Compile & Deploy
- Execute production website compilation via `npm run build`.
- Stage, commit, and push modifications to remote branches and mirror locally.

# Phase 5 Audit: Decoupled Focus BubbleMenu (Desktop)
Status: COMPLETE

## Changes
- Updated `<BubbleMenu>`'s `shouldShow` callback in desktop `App.tsx` to handle Tippy input focus correctly by verifying document active elements relative to Tippy roots.
- Updated `insertLink()` to focus the editor view before popover mounting.

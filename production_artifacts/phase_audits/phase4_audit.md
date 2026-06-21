# Phase 4 Audit: Decoupled Focus BubbleMenu (Web)
Status: COMPLETE

## Changes
- Updated `<BubbleMenu>`'s `shouldShow` callback in `notepad.tsx` to handle Tippy input focus correctly by verifying document active elements relative to Tippy roots.
- Updated `insertLink()` to focus the editor view before popover mounting.

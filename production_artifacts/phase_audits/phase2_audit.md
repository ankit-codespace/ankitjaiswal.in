# Phase 2 Audit: Web Note-Switching State Isolation
Status: COMPLETE

## Changes
- Injected an activeId dependent `useEffect` hook in `notepad.tsx`.
- Ensured switching note tabs invokes `closeLinkPopover()` to clear open states, preventing popovers from leaking onto new notes.

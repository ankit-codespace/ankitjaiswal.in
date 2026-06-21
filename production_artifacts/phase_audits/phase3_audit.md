# Phase 3 Audit: Desktop Note-Switching State Isolation
Status: COMPLETE

## Changes
- Injected an activeId dependent `useEffect` hook in desktop `App.tsx`.
- Ensured switching note tabs resets local link popover states by invoking `closeLinkPopover()`.

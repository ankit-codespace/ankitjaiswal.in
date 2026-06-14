# Notepad Upgrade Analysis Summary

## Summary of Differences
A comparison between the Windows Electron app and the current Web version was conducted. We identified a total of 15 key features/shortcuts that differ.

### Classifications
- **PORT:** 9 items (Tab Pinning, Tab Color Coding, Duplicate/Bulk Closure actions, Zoom Controls, Outline Sidebar, Baseline Grid Snapper, Ctrl+Shift+H Highlight)
- **ADAPT:** 3 items (Native File Open/Save -> Web File System Access API, Ctrl+H -> Highlight, Ctrl+F -> Intercept App Find)
- **SKIP:** 4 items (Ctrl+N/T, Ctrl+W, Ctrl+Shift+W, Ctrl+Shift+T browser clashing shortcuts)
- **INVESTIGATE:** 0 items

## Highest Risk Items
1. **Keyboard Shortcut Conflicts (Ctrl+F, Ctrl+H):** Overriding `Ctrl+F` and `Ctrl+H` must be handled delicately to prevent breaking native browser workflows, while complying with the user instructions. We will hook the keydown event listener globally but target input/editor context appropriately.
2. **File System Access API:** Since `showOpenFilePicker` and `showSaveFilePicker` require secure contexts (HTTPS or localhost) and might not be supported on all browsers, we must implement solid, seamless fallback paths using standard blob-download methods.

## Recommended Execution Order
1. **Phase 1: Visual and CSS upgrades** (Tab CSS, Pinned layout styles, Outline sidebar layout, Color picker UI).
2. **Phase 2: Context menu upgrades** (React-based context menu for tabs).
3. **Phase 3: File menu upgrades** (Direct file access API integration with fallbacks).
4. **Phase 4: Behavioral feature upgrades** (Outline sidebar dynamic spy, Baseline grid snapper, zoom state).
5. **Phase 5: Keyboard shortcut updates** (centralized keyboard shortcut hook, custom bindings).
6. **Phase 6: Final audit and cleanup** (auditing, building, and validation).

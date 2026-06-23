# Skill: Execute Close Tab & Mass Close Alignment

Execute code changes sequentially in web and desktop platforms.

## Execution Loop

### Phase 1: Web Notepad Alignment
- Modify `artifacts/website/src/pages/tools/notepad.tsx`.
- Update `NotepadDoc` interface.
- Replace tab list close `X` buttons `setDeleteConfirm` calls with direct `deleteDoc(doc.id)` calls.
- Update switcher item close buttons to conditionally call `deleteDoc` or `setDeleteConfirm`.
- Update File Menu "Close Tab" button to check `activeDoc?.isPinned`.
- Update Tab context menu "Close Tab" button to check `targetDoc.isPinned`.
- Adjust `closeOtherDocs` and `closeDocsToTheRight` to preserve pinned tabs.

### Phase 2: Desktop App Alignment
- Modify `notepad-win/src/renderer/src/App.tsx`.
- Update `NotepadDoc` interface.
- Add `batchId` support to `executeDeleteDoc`.
- Adjust `closeOtherDocs` and `closeDocsToTheRight` to preserve pinned tabs and tag closed tabs with `batchId`.
- Update `restoreLastClosedDoc` to check `closeBatchId` and restore all batched tabs in one operation.

### Phase 3: Verification
- Execute `pnpm run build` from the workspace root.
- Validate that the build succeeds with exit code 0.

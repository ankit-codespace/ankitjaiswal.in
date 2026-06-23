# Skill: Plan Close Tab & Mass Close Alignment

Generate the phased implementation plan for modifying the close and restore behaviors.

## Implementation Steps

### Phase 1: Web Notepad Alignment (`notepad.tsx`)
1. Add `closeBatchId?: string;` property to `NotepadDoc` interface.
2. In tab list render (both active and inactive non-pinned tabs), change the `onClick` event on the `X` button to call `deleteDoc(doc.id)` directly instead of `setDeleteConfirm`.
3. In Doc Switcher list render, update the click handler on the switcher item close button to check `d.isPinned`. If true, trigger `setDeleteConfirm`; otherwise, call `deleteDoc(d.id)` directly.
4. In File Menu "Close Tab" button, check if `activeDoc?.isPinned`. If true, trigger `setDeleteConfirm`; otherwise, call `deleteDoc(activeId)` directly.
5. In Tab right-click Context Menu "Close Tab" item, check if `targetDoc.isPinned`. If true, trigger `setDeleteConfirm`; otherwise, call `deleteDoc(targetDoc.id)` directly.
6. Refactor `closeOtherDocs(idToKeep)` to filter `nextDocs = docs.filter((d) => d.id === idToKeep || d.isPinned)`.
7. Refactor `closeDocsToTheRight(id)` to include `|| d.isPinned` in the filter logic.

### Phase 2: Desktop App Alignment (`App.tsx`)
1. Add `closeBatchId?: string;` property to `NotepadDoc` interface.
2. Update `executeDeleteDoc(idToDelete, batchId?: string)` to check if `batchId` is provided. If so, set it on the saved doc history: `{ ...targetDoc, closeBatchId: batchId }`.
3. In `closeOtherDocs(idToKeep)`, generate a unique `batchId` and assign it to all closed tabs. Set `nextDocs` to retain pinned tabs: `docs.filter(d => d.id === idToKeep || d.isPinned)`.
4. In `closeDocsToTheRight(id)`, generate a unique `batchId` and assign it to all closed tabs. Filter `nextDocs` to retain pinned tabs.
5. In `restoreLastClosedDoc`, check if the last closed doc has a `closeBatchId`. If so, restore all closed docs sharing that batch ID at once and remove them from the history list.

### Phase 3: Verification
1. Run `pnpm run build` from the workspace root to verify that both web and desktop projects compile successfully.
2. Verify that there are no TS compiler or ESLint errors.

# Skill: Plan Large File Guard & Error Boundaries

This skill guides the creation of the phased implementation plan and records it inside `production_artifacts/build_plan.md`.

## Planning Instructions

Write the implementation plan to `production_artifacts/build_plan.md` with the following structure:

```markdown
# Build Plan: Large File Guard, Dual-Editor Fallbacks, & React Error Boundaries

## Task Summary
This plan details the steps to build a bulletproof file size guard, dual-mode text editing (Rich Formatting vs Raw Fast Plain Text), and React error isolation boundaries for both the Web and Desktop versions of "I Love Notepad". This prevents browser crashes, memory spikes, and data loss.

## Success Criteria
1. **Size-Gated Load Guard**: Files over 1.0MB trigger a premium warning modal explaining performance trade-offs, instead of crashing the UI or blocking access with a cheap system dialog.
2. **Dual Editor Engine**: Users can select "Raw Plain-Text Mode" which disables TipTap overhead and renders a high-performance, style-matched `<textarea>` that easily handles files up to 10MB without lag.
3. **React Error Boundaries**: A rendering crash inside TipTap does not take down the entire page. Only the editor panel shows a premium recovery card allowing text salvage and switching back to plain-text mode.
4. **Desktop IPC Size Bypass**: Electron's `main.js` is modified to allow files up to 10MB in Raw Mode (replacing the hard 1.5MB block), while retaining safety checks.
5. **Type Safety & Build**: Compilation using `pnpm run build` completes successfully.

## Affected Files and Systems
- **Web Editor Page**: `artifacts/website/src/pages/tools/notepad.tsx`
- **Desktop Editor Page**: `notepad-win/src/renderer/src/App.tsx`
- **Desktop Main Process**: `notepad-win/src/main/main.js`

---

## Implementation Phases

### Phase 1: Proactive Load Guard & Warning Modals (Web & Desktop)
#### Objective
Detect large files during import and display a premium modal offering load mode choices.

#### Execution Steps
- **Step 1.1**: Define the custom modal UI state: `const [largeFilePrompt, setLargeFilePrompt] = useState<{ fileName: string; fileSize: number; fileText: string; filePath?: string } | null>(null)`.
- **Step 1.2**: Update file open handlers (`handleOpenFileAccess` on Web, `handleOpenNativeFile` on Desktop) to read the size metadata *before* creating a document tab. If size > 1.0MB (1,048,576 bytes):
  - Save file information to `largeFilePrompt` and open the custom modal.
- **Step 1.3**: Design the modal UI:
  - High-end glassmorphism design with a dark overlay, rounded corners, subtle shadows, and Sora/Inter fonts.
  - Informative text: "Performance Guard: Opening a large file ({size})".
  - Choice Buttons:
    - **Raw Text Mode (Fast & Safe)**: Launches the document with `mode: "raw"` state, disabling TipTap.
    - **Rich Text Mode (Full Formatting)**: Opens the document normally in TipTap.
    - **Load First 150KB**: Reads a subset of the file and opens it.
- **Step 1.4**: If the user clicks a choice, construct the `NotepadDoc` state with the appropriate text, title, and `mode` flag, update `docs`, change tab, and clear `largeFilePrompt`.

---

### Phase 2: Dual Editor Engine (TipTap vs Raw Textarea)
#### Objective
Introduce a high-performance plain text editor mode for large files.

#### Execution Steps
- **Step 2.1**: Update the `NotepadDoc` interface in both `notepad.tsx` and `App.tsx` to include `mode?: "rich" | "raw"`. Save this attribute alongside document persistence.
- **Step 2.2**: Update the main editor wrapper layout. If `activeDoc?.mode === "raw"`:
  - Render an optimized, stylish React `<textarea>` styled to match the editor background, padding, writing width settings, and typography.
  - Implement real-time character/word counts, cursor position tracking (`Ln X, Col Y`), and custom scroll snapping if enabled.
- **Step 2.3**: If `activeDoc?.mode === "raw"`, disable rich text formatting buttons in the toolbar (make them greyed out with a subtle tooltip: "⚡ Performance Mode active: Rich formatting disabled for raw text files").
- **Step 2.4**: Add a toggle button in the toolbar/dropdown: "Convert to Rich Text" and "Switch to Plain Text" so users can change modes on the fly.

---

### Phase 3: React Error Boundary & Recovery Screens
#### Objective
Isolate editor crashes to prevent the entire page/window from crashing and provide data recovery.

#### Execution Steps
- **Step 3.1**: Create a `NotepadErrorBoundary` component class in React.
- **Step 3.2**: In `componentDidCatch(error, errorInfo)`, log the crash metadata. Show a fallback UI if a crash is caught:
  - Display a premium card: "Editor Render Isolated".
  - Explain: "An unexpected error occurred while drawing this document's rich format structure."
  - Buttons:
    - **Open as Plain Text**: Safely re-opens the document text in `raw` mode (bypassing TipTap).
    - **Export Backup File**: Saves the document content directly to a `.txt` file using native save streams.
    - **Reset Note**: Deletes formatting nodes to force clean parsing.
- **Step 3.3**: Wrap the `<EditorContent>` (TipTap editor content) inside `NotepadErrorBoundary` in the component tree. Keep tab switcher, sidebar, settings, and header navigation OUTSIDE the boundary so they remain fully functional when the editor crashes.

---

### Phase 4: Desktop IPC & Electron Main Process Optimization
#### Objective
Update Electron main process file gating from a hard blocker to a metadata-first loader.

#### Execution Steps
- **Step 4.1**: In `main.js`, increase the hard block limit in `isFileSafe` to 10.0MB, but add a return attribute indicating whether the file size exceeds the soft limit: `isLarge: stats.size > 1.0 * 1024 * 1024`.
- **Step 4.2**: Modify `openFileInWindow` and the `native-open-file` IPC handler. If the file is large, pass `isLarge: true` in the IPC response along with file size.
- **Step 4.3**: Update `handleOpenNativeFile` in `App.tsx` to intercept this IPC response, and if `isLarge` is true, trigger the custom `largeFilePrompt` modal inside the React renderer instead of throwing a system error box.
- **Step 4.4**: Optimize Electron's crash logger in `main.js` (`logCrash`) to log render process failures cleanly.

---

### Phase 5: Verification & Verification Plan
#### Objective
Verify compilation, styling parity, load performance, error containment, and file recovery.

#### Verification Checkpoint
- Compile Web version with `pnpm run build` and ensure no type-check failures.
- Compile Desktop version with Electron builder and ensure installers build cleanly.
```

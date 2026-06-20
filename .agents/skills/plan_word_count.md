# Skill: Plan Word Count Hardening and Selection Features

This skill defines the step-by-step phases to resolve word count mismatch (0 words), implement selection word count, align both Desktop and Web, and build/verify the application.

## Phased Implementation Plan

- **Phase 1: Desktop Word Count Hardening**
  - **Objective**: Fix the `0 words` bug on startup/doc switch, and implement selected word counting.
  - **Sub-steps**:
    - 1.1: Replace Tiptap's characterCount storage computation with custom logic using `editor.getText()` and selection tracking.
    - 1.2: Update the header stats render block to display selected words out of total words when selection is active.
- **Phase 2: Web Word Count Alignment**
  - **Objective**: Bring the web-based portfolio notepad header to feature parity with the desktop application.
  - **Sub-steps**:
    - 2.1: Add `onSelectionUpdate` listener and a trigger state (`editorUpdateTrigger`) to the editor setup in `notepad.tsx`.
    - 2.2: Implement the custom word count & selection stats calculator in `notepad.tsx`.
    - 2.3: Modify the website header to render the status: `{hasTextSelection ? ... : ...} · {savedAgo}`.
- **Phase 3: Production Builds & Deployment**
  - **Objective**: Run production compilers, verify UI layouts, bundle installers, and push updates live.
  - **Sub-steps**:
    - 3.1: Build desktop renderer using `npm run build:renderer`.
    - 3.2: Build web output using `npm run build`.
    - 3.3: Generate NSIS offline setups and AppX store packages.
    - 3.4: Push code changes to GitHub repository.
    - 3.5: Provide server deployment trigger instructions.

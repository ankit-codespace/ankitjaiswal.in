# Skill: Plan Link Selection and Popover UX Hardening

This skill creates a structured, phased plan to implement the pointer-events bypass, a custom link tooltip BubbleMenu, and popover link editing inputs, removing the primitive `window.prompt` blocker and resolving the focus-blur closure bug.

## Plan Creation Steps

1. **Initialize Plan**: Generate a markdown build plan and write it to `production_artifacts/build_plan.md`.
2. **Define Phases**:
   - **Phase 1: CSS Selection Bypass**
     - Objective: Enable normal cursor placement, selection, and shift-clicking on links.
     - Sub-steps:
       - 1.1: Add `.ProseMirror a { pointer-events: none; }` to the styles of both desktop (`index.css`) and web (`index.css`).
       - 1.2: Check that hover styles (underlines and colors) are preserved when hover takes place over the parent text elements.
   - **Phase 2: Floating Tooltip BubbleMenu (Desktop)**
     - Objective: Add a floating action panel when cursor is inside a link in `App.tsx` and fix the focus-blur closure bug.
     - Sub-steps:
       - 2.1: Implement a new `<BubbleMenu>` in `App.tsx` containing:
         - A target display link that opens in new tab: `<a style={{ pointerEvents: "auto", ... }} href={url} target="_blank">`
         - An "Edit" button (toggles an edit state input within the menu).
         - An "Unlink" button which calls `unsetLink()`.
       - 2.2: Set the BubbleMenu trigger rule to support focus decoupling: `shouldShow={({ editor }) => !!(isLinkPopoverOpen || (editor.isFocused && editor.isActive("link")))}`.
   - **Phase 3: Floating Tooltip BubbleMenu (Web)**
     - Objective: Add the floating link action panel to the web portfolio editor `notepad.tsx`.
     - Sub-steps:
       - 3.1: Import `BubbleMenu` from `@tiptap/react` in `notepad.tsx`.
       - 3.2: Replicate the Link BubbleMenu markup, styling, and handlers in `notepad.tsx` with focus decoupling trigger.
   - **Phase 4: Remove window.prompt & Harden Ctrl+K Shortcut**
     - Objective: Wire up `Ctrl + K` and the toolbar button to trigger the BubbleMenu input field instead of native dialog prompts.
     - Sub-steps:
       - 4.1: Modify `insertLink` function in both files to set selection state and focus the BubbleMenu's URL input.
       - 4.2: Intercept `Ctrl + K` in global keyboard listeners and trigger the popover/bubble menu input.
   - **Phase 5: Dev Verification & Packaging**
     - Objective: Compile web and desktop shells, build installers, and push to live.

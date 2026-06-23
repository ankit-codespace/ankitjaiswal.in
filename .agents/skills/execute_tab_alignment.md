# Skill: Execute Tab Alignment

This skill guides the exact, low-risk execution and verification of each step in `production_artifacts/build_plan_tab_alignment.md`.

## Execution Protocol
For each step:
1. Re-read the corresponding section in `production_artifacts/build_plan_tab_alignment.md`.
2. Inspect the lines in `notepad.tsx` before modifying.
3. Make the minimal necessary change using specific code blocks.
4. Verify the compilation status immediately with `pnpm run build`.
5. Log progress to `build_log.md` with timestamps.

## Tasks

### Phase 1: Header Row & Navigation Alignments
* Modify Row 1 container height, button offsets, and separators in `notepad.tsx`.
* Verify that vertical elements align optically.

### Phase 2: Plus Button & Separators Cleanup
* Move Plus button inside the tabs container in `notepad.tsx`.
* Remove redundant separators from Right Zone.
* Verify tabs container styling and flow.

### Phase 3: Action Buttons & Menu Relocations
* Remove Shortcuts & Feedback icons from Row 1.
* Add "Send Feedback" to the File Menu.
* Adjust dropdown offsets (`top: 80`, `top: 82`, `top: 84`).
* Build and verify.

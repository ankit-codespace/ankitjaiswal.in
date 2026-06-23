---
description: Implement proactive size gating, visual warning modals, high-performance raw editor fallbacks, and React error boundaries for large files.
---

# Workflow: Large File Guard & Error Boundaries

## Trigger
User types: `/notepad_large_files`

## Steps

1. **Analyze**: Run `analyze_notepad_large_files` to inspect file loader systems, IPC bridges, rendering cycles, and constraints on Web and Desktop.
2. **Plan**: Run `plan_notepad_large_files` to generate the detailed step-by-step roadmap in `production_artifacts/build_plan.md`.
3. **Initialize Logs**: Verify `build_log.md` exists and initialize the session log entries.
4. **Execute**:
   - Execute Phase 1: Proactive Load Guard & Warning Modals (Web & Desktop).
   - Execute Phase 2: Dual Editor Engine (TipTap vs Raw Textarea).
   - Execute Phase 3: React Error Boundary & Recovery Screens.
   - Execute Phase 4: Desktop IPC & Electron Main Process Optimization.
5. **Verify Completion**: Run builds for Web (`pnpm run build`) and verify Electron build passes.
6. **Finalize**: Write `_changelog/LATEST.md` and history tracking records.

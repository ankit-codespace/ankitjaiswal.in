# Skill: Execute Phase

This skill drives active code modifications in a safe, incremental loop.

## The Execution Loop

For each sub-step (e.g., Step 1.1, Step 1.2) defined in `production_artifacts/build_plan.md`, the executing agent must follow these 9 steps exactly:

1. **Re-Read the Plan Step**: Re-read the specific step description, objectives, and verification criteria to keep target outcomes clear.
2. **Re-Read Affected Files**: View the target files at the lines to be modified. Do not make edits without looking at the current code state first.
3. **Make the Smallest Safe Change**: Write a precise edit (e.g. using `replace_file_content`) to change only the required lines. Do not touch unrelated code.
4. **Re-Read Changed Files**: View the file changes in the workspace to verify correct insertion, formatting, and clean indentation.
5. **Run Relevant Checks**: Execute local verification checks (e.g., run `pnpm run build`) to ensure there are no compilation, type, or styling build errors.
6. **Fix Obvious Issues**: If the compiler warns about unused imports, missing type definitions, or syntax errors, fix them immediately.
7. **Log Progress to build_log.md**: Document the sub-step completion, timestamp, changes made, and compiler status in the global `build_log.md`.
8. **Re-Check High-Level Goal**: Evaluate if this sub-step successfully moves the system closer to layout parity, scroll recovery, and ruler alignment.
9. **Determine Next Action**: Decide whether to:
   - **Continue**: Move to the next plan step.
   - **Revise**: Correct current changes if verification checks failed.
   - **Research**: Perform further code research or web queries if a blocker was hit.
   - **Stop**: Stop if the phase is complete or a fatal blocker requires architect intervention.

## Core Rules

- **Never Batch Multiple Risky Changes Together**: Commit/verify one step before moving to the next.
- **Never Skip Verification**: Always test the build and layout after every single modification.
- **Never Continue Blindly after Failure**: If a step breaks compiling or runs into type check failures, fix or revert it immediately. Do not build on top of broken states.

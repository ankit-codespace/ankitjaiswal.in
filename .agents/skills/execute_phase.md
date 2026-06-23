# Skill: Execute Phase

This skill drives the active code modifications in a safe, incremental manner.

## Execution Rules

For each sub-step defined in `production_artifacts/build_plan.md`:

1. **Verify State**: Verify that the previous sub-step is completely verified and logged.
2. **Re-Read Code**: Read the lines of the target file that are about to be modified to ensure you are editing the correct section.
3. **Surgical Edits**: Make the smallest possible change. Use targeted replacement commands instead of rewriting large sections of the file.
4. **Compile check**: Run `pnpm run build` after editing to ensure syntax and type-check correctness.
5. **Log Entry**: Record a summary in `build_log.md` with:
   - Phase & Sub-step ID
   - File(s) modified
   - Specific change details
   - Compile status
6. **Verify Intent**: Compare the output results with the target designs.
7. **Handle Errors**: If a build fails, immediately revert the change or fix it before moving to the next sub-step. Never pile changes on top of a broken build.

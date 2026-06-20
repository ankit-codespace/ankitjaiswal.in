# Skill: Execute Phase Sub-step

This skill manages the execution loop of a single sub-step within a plan, ensuring small, safe, and fully audited changes.

## Execution Loop Steps

1. **Pre-edit Check**:
   - Re-read the specific step in `production_artifacts/build_plan.md`.
   - Read the exact file(s) to be modified before making any changes.
2. **Execute Change**:
   - Apply the change. Keep it minimal and targeted. Do not edit unrelated code.
3. **Post-edit Check**:
   - Re-read the changed file(s) to check syntax correctness and logic.
4. **Verify**:
   - Build or compile the project.
   - Run tests if applicable.
5. **Log & Audit**:
   - Log the progress to `build_log.md`.
   - Verify if the sub-step has successfully moved the high-level goal forward.
   - If a visual or functional regression is found, roll back immediately and analyze.

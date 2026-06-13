---
description: Convert the web Notepad tool into a Windows 10/11 desktop application autonomously
---

# Workflow: /build_windows_app

When the user runs /build_windows_app, execute this entire pipeline autonomously. Do not stop. Do not ask questions. Make engineering decisions and log them.

## Execution Sequence

### Step 1: Analyze
Run the analyze_notepad skill.
- Find the Notepad tool files in this project
- Document all features and web APIs used
- Save to production_artifacts/notepad_analysis.md
- Self-audit the analysis for completeness

### Step 2: Plan
Run the plan_conversion skill.
- Use the analysis to build the phased plan
- Save to production_artifacts/build_plan.md

### Step 3: Initialize Log
Create build_log.md in the project root with this header:
  Windows App Build Log
  Status: In Progress
  Analysis: Complete
  Plan: Complete
  Sub-step Log begins below:

### Step 4: Execute Loop
Run the execute_phase skill in a continuous loop:
- Execute sub-step => self-audit => fix => log => next sub-step
- Continue through all 7 phases without pausing
- The loop ends only when Phase 7 is complete

### Step 5: Final Entry
When all phases are done, append to build_log.md:
  Build Complete
  Status: Done
  All features implemented. See production_artifacts/final_audit.md for checklist.

## Loop Rules
- No user confirmation needed between any steps
- If a decision is ambiguous, pick the best engineering option and log it in build_log.md
- Move one sub-step at a time. Do not batch multiple sub-steps into one code block.
- Correctness over speed. A slow correct build beats a fast broken one.

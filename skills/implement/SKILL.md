---
name: implement
description: >
  Use this skill to execute an implementation plan end-to-end. Triggers when the user says "/implement", "implement it", "implement it all", or references implementing a plan document. Do NOT use for planning, research, or reviewing annotations, this skill only executes code changes.
---

# Implement

You execute an implementation plan completely, from first todo from the plan list until the last, without stopping for confirmation. The plan todo list is the source of truth. Every decision has already been made. Your job is mechanical execution.

## Prerequisites

A plan document (`plan_*.md`) must exist in the current working directory. If none exists, notify the user and stop.

The plan document must contain a todo list, a clear, ordered set of actionable items that fully covers what needs to be built or changed. Todos use checkbox syntax (`- [ ]` for pending, `- [x]` for done). If no todo list exists, create one from the phases and tasks described in the document before starting implementation.

## Behavioral Rules

These rules are non-negotiable. Follow them exactly:

- **Implement everything.** Do not cherry-pick tasks. Do not skip phases. Do not ask the user whether to proceed between phases.
- **Mark the todos as completed in the plan document as you finish them.** The plan todo list is the live progress tracker. After completing each todo, update the plan document to mark it done using `- [x]`.
- **Do not stop until all tasks and phases are completed.** No mid-flow pauses, no "should I continue?", no check-ins. Keep going.
- **Do not add unnecessary comments or docstrings.** Only add a comment when the logic is genuinely non-obvious to a competent reader.
- **Do not use `any` types.** Maintain strict typing throughout.
- **Run the checkers continuously.** After each meaningful chunk of changes, run typecheck, linters, and tests to catch issues early. Do not batch up all changes and check only at the end.
- **Do not invoke other skills.** Do not use `/annotate`, `/review`, `/plan`, `/research`, or any other skill during implementation. This skill runs alone, start to finish.

## Workflow

### Step 1 - Read the plan

Find and read the most recent `plan_*.md` in the current working directory. If multiple exist, use the one modified most recently.

Understand the full scope before writing a single line of code:
- All todos
- Dependencies between components
- Guards (lint, typecheck, test checks) at the end of each phase

### Step 2 - Execute todo by todo

Work through each todo in order.

For each todo:
1. Read the relevant existing files before changing them
2. Make the changes
3. Run typecheck
4. Fix any type errors before moving on
5. Mark the todo as completed in the plan document

At the end of each todo, run the guards (linters, typecheck, tests if needed). Do not start the next todo until all guards pass.

### Step 3 - Final verification

After all todos are complete:
1. Run the full test suite
2. Run typecheck (if applicable)
3. Run linters

If anything fails, fix it before declaring done.

### Step 4 - Report

Once everything passes, give the user a short summary:

```
## Implementation Complete

Completed N todos.

- [Short description of what was built or changed]
- [Short description of what was built or changed]

All guards passed.
```

## Important Notes

- If a todo requires creating a new file or module that doesn't exist yet, go ahead and create it.
- If the plan is ambiguous on a detail, make the most reasonable choice given the surrounding context, do not stop to ask.
- If a guard fails in a way that suggests the plan itself is broken (e.g., a type error that can't be fixed without rethinking the architecture), stop, explain the problem clearly, and ask the user how to proceed. This is the only valid reason to pause.

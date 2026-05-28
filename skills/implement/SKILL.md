---
name: implement
description: Executes an existing plan_*.md end-to-end without stopping for confirmation between phases. Use when the user says "/implement", "implement it", or "implement the plan". Not for planning, research, or annotation review.
---

# Implement

You execute an implementation plan completely, from first todo from the plan list until the last, without stopping for confirmation. The plan todo list is the source of truth. Every decision has already been made. Your job is mechanical execution.

## Prerequisites

A plan document (`plan_*.md`) must exist in the current working directory. If none exists, notify the user and stop.

The plan document must contain a todo list, a clear, ordered set of actionable items that fully covers what needs to be built or changed. If no todo list exists, create one from the phases and tasks described in the document before starting implementation.

## Behavioral Rules

These rules are non-negotiable. Follow them exactly:

- **Implement everything.** Do not cherry-pick tasks. Do not skip phases. Do not ask the user whether to proceed between phases.
- **Mark the phases as done in the plan document as you finish them.** After completing each phase, update the plan document to mark it done using `- [x]`.
- **Do not stop until all tasks and phases are completed.** No mid-flow pauses, no "should I continue?", no check-ins. Keep going.
- **Do not add unnecessary comments or docstrings.** Only add a comment when the logic is genuinely non-obvious to a competent reader.
- **Do not use `any` types.** Maintain strict typing throughout.
- **Do not invoke other skills.** Do not use `/annotate`, `/review`, `/plan`, `/research`, or any other skill during implementation. This skill runs alone, start to finish.

## Workflow

### Step 1 - Read the plan

Find and read the last created `plan_*.md` from the current session. Understand the scope.

### Step 2 - Execute todo by todo

Work through each todo in order.

For each todo:
1. Read the relevant existing files before changing them
2. Make the changes

### Step 3 - Mark the phases as done

After completing each phase, mark the phases you just implemented.

### Step 4 - Executive report

Once everything passes, give the user a short summary:

```
## Implementation Complete

Completed N todos.

- [Short description of what was built or changed]
- [Short description of what was built or changed]

All guards passed.
```

## Important Notes

- If the plan is ambiguous on a detail, make the most reasonable choice given the surrounding context, do not stop to ask.
- If a guard fails in a way that suggests the plan itself is broken (e.g., a type error that can't be fixed without rethinking the architecture), stop, explain the problem clearly, and ask the user how to proceed. This is the only valid reason to pause.

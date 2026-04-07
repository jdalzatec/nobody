---
name: plan
description: >
  Generate and iteratively refine an implementation plan from a technical spec.
  Use this skill whenever the user wants to create an implementation plan from a
  research.md file, break down a technical spec into components, or plan code changes
  based on a spec. Also triggers when the user says "/plan", "plan this", "create a
  plan from the spec", "break this down", or references planning implementation work
  from a research document. Even if the user just says "plan" with a research.md in
  the project, use this skill.
---

# Plan Skill

You turn a technical specification (`research.md`) into a high-level implementation plan (`plan.md`), then refine it through conversation with the user until they're satisfied.

The goal is a plan that captures *what* needs to change and *why*, organized by component — not line-level diffs or task lists. Think of it as the bridge between "here's what we want" and "here's how we'll build it." Keep it high-level enough that it can evolve through discussion, but concrete enough that someone could start working from it.

## Step 1: Read the spec

Read `research.md` from the current working directory. If the file doesn't exist, ask the user where their spec is — but the convention is always `research.md`.

Understand the spec thoroughly before writing anything. Pay attention to:
- The core problem being solved
- Key requirements and constraints
- Dependencies between components
- Any non-obvious implications

## Step 2: Write the plan

Create `plan.md` in the current working directory with this structure:

```markdown
# Implementation Plan

## Overview
A 2-3 sentence summary of what this plan accomplishes and the approach taken.

## Components

### [Component Name]
**What changes:** Brief description of what needs to be added, modified, or removed.
**Why:** The reasoning — which part of the spec drives this change.
**Depends on:** Other components this one depends on (if any).
**Notes:** Anything non-obvious — risks, open questions, alternatives considered.

### [Next Component]
...

## Order of Operations
A suggested sequence for implementation, based on dependencies. Not rigid — just a reasonable starting point.

## Open Questions
Anything from the spec that's ambiguous or needs a decision before implementation.
```

Guidelines for writing the plan:
- **Stay high-level.** Name the components, files, or modules that change — don't write pseudocode or list every function signature. The user wants to think at the architecture level, not the implementation level.
- **Be honest about ambiguity.** If the spec is vague on something, say so in Open Questions rather than guessing.
- **Group by logical component**, not by file. If a feature touches three files, that's one component with a note about which files are involved.
- **Keep it scannable.** The user will read this, mark it up, and come back. Short paragraphs, clear headers.

After writing the file, tell the user: "I've created `plan.md`. Take a look, and if anything needs changes, add comments directly in the file using `> COMMENT: your feedback here` next to the sections you want revised. When everything looks good, add a comment like `> COMMENT: looks good` and I'll finalize it."

## Step 3: Process comments

When the user comes back, re-read `plan.md` and look for lines starting with `> COMMENT:`.

**Check for approval:** If all comments are positive signals — phrases like "looks good", "this is done", "approved", "this is ok", "this is fine", "lgtm", "ship it", "all good", "perfect" — the plan is accepted. Remove those comment lines from the file, tell the user the plan is finalized, and you're done.

**Process revision comments:** For any comment that's requesting a change:

1. Identify which section the comment belongs to (it should be near or inside a section).
2. Revise **only that section** based on the feedback. Do not touch sections without comments — preserve them exactly as they are.
3. Remove the processed `> COMMENT:` lines after applying the changes.
4. If a comment is ambiguous, ask the user to clarify rather than guessing.

After processing, tell the user you've updated `plan.md` and invite them to review again. This loop continues until the user signals approval.

**Important:** Each revision pass should be minimal and surgical. Only change what the comments ask for. The user has already reviewed and implicitly approved everything they didn't comment on — changing those sections would undermine their trust in the process.

## The loop

The full cycle looks like this:

1. Read `research.md` -> write `plan.md`
2. User reviews `plan.md`, adds `> COMMENT:` lines
3. You re-read, apply changes only where commented, remove comment markers
4. Repeat from step 2 until the user approves

Be patient with this loop. Some plans take several passes to get right, especially for complex specs. That's the point — iterative refinement produces better plans than trying to nail it in one shot.
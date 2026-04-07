---
name: plan
description: >
  Use this skill whenever the user wants to create an implementation plan, break a new feature down into components, or plan code changes. Triggers when the user says "/plan", "plan this", or references planning work from a research document along with a feature prompt.
---

# Plan Skill

You turn a deep understanding of the entire project, or a part of it (`research.md`), into a feature implementation plan (`plan.md`), then refine it through iterative review with the user until they're satisfied.

The goal is a plan that captures *what* needs to change and *why*. Think of it as the bridge between "here's what we have" and "here's how we'll build the new feature." It can evolve through review annotations.

## Step 1: Read the research

Read `research_$(date +%Y%m%d%H%M).md` from the current working directory, this file should exist.

Understand the spec thoroughly before writing anything. Pay attention to:
- The core feature
- Key requirements and constraints
- Dependencies between components, modules

If anything is unclear from the research file or the prompt, ask the user before proceeding. This is the place to resolve all open questions — don't guess.

## Step 2: Write the plan

Create `plan_$(date +%Y%m%d%H%M).md` in the current working directory with this structure:

```markdown
# Implementation Plan

## Overview
A 2-3 sentence summary of what this plan accomplishes and the approach taken to solve the feature.

## Components

### [Component Name]
**What changes:** Brief description of what needs to be added, modified, or removed.
**Why:** The reasoning — which part of the spec drives this change.
**Depends on:** Other components this one depends on (if any).

### [Next Component]
...
```

Guidelines for writing the plan:
- **Match the right level of detail.** Name the components, files, or modules that change. Use pseudocode when it helps clarify a non-obvious implementation — the user needs to think at both the architecture and implementation level.
- **Be honest about ambiguity.** If the spec is vague on something, surface it in Step 1 rather than guessing.
- **Keep it scannable.** The user will read this, mark it up, and come back. Short paragraphs, clear headers.

After writing the file, tell the user: "I've created `plan_$(date +%Y%m%d%H%M).md`. Take a look, and if anything needs changes, use `/annotate` and `/review`."

## The loop

The full cycle looks like this:

1. Read `research.md` -> write `plan.md`
2. User reviews `plan.md` using `/annotate` and `/review`
3. Repeat step 2 until the user is satisfied

Be patient with this loop. Some plans take several passes to get right, especially for complex specs. That's the point — iterative refinement produces better plans than trying to nail it in one shot.

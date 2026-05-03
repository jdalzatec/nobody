---
name: plan
description: >
  Use this skill whenever the user wants to create an implementation plan, break a new feature down into components, or plan code changes. Triggers when the user says "/plan", "plan this", or references planning work from a research document along with a feature prompt.
---

# Plan

You turn a deep understanding of the entire project, or a part of it (`research_*.md`), into a feature implementation plan, then refine it through iterative review with the user until they're satisfied.

The goal is a plan that captures *what* needs to change and *why*. Think of it as the bridge between "here's what we have" and "here's how we'll build the new feature." It can evolve through review annotations.

## Step 1: Read the research

Read the research file created in the current session, this file should exist. If it does not exist, notify the user about this.

Understand the spec thoroughly before writing anything. Pay attention to:
- The core feature
- Key requirements and constraints
- Dependencies between components, modules

That should be answered from the research file plus the user prompt. **All ambiguity must be resolved here, before moving to Step 2.** If anything is unclear from the research file or the prompt — scope, requirements, dependencies, naming, sequencing, anything — use the `AskUserQuestion` tool to resolve it interactively. Do not guess, and do not defer the question into the plan document. The plan written in Step 2 must read as a set of decisions, not a list of open questions for the user. By the time you start writing, every question you had has an answer.

## Step 2: Write the plan

Use the following script to get the plan name:

```sh
bash scripts/new-plan-name.sh
```

Create the plan document in the current working directory with this structure:

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

## Phases

### Phase #

### Phase # guards
...
```

Guidelines for writing the plan:
- **Match the right level of detail.** Name the components, files, or modules that change. Use pseudocode when it helps clarify a non-obvious implementation — the user needs to think at both the architecture and implementation level.
- **Resolve ambiguity before writing.** Use `AskUserQuestion` in Step 1 — never defer a question into the plan body. The plan must read as a set of decisions, not open questions. No TBDs, no "we should decide later," no questions directed at the user.
- **Keep it scannable.** The user will read this, mark it up, and come back. Short paragraphs, clear headers.
- **Add reachable guards.** Every phase should contain guards to guarantee that the linters, typecheckers, and tests passed correctly.
- **No git operations in phases.** Phases must not include `git commit` or `git push` steps — those are controlled by the user.

After writing the file, use the `/annotate [plan name]` skill to get user annotations. Tell the user they should use `/review` after annotating the document to get a reviewed version of the plan after comments.

## The loop

The full cycle looks like this:

1. Read the research file -> write plan file
2. User reviews the plan file using `/annotate` and add comments
3. User indicates that the document is ready to be reviewed (you should use `/review` for it)
4. Serve the new file version using `/annotate`
5. Repeat step 2 until the user is satisfied

Be patient with this loop. Some plans take several passes to get right, especially for complex specs. That's the point — iterative refinement produces better plans than trying to nail it in one shot.

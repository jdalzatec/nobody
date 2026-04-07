---
name: add-todos
description: Generate a detailed, phased todo list from a reviewed plan document. Use when the user wants to add tasks, todos, a checklist, or an implementation breakdown to a plan file (typically plan_*.md). Triggers include phrases like "add todos", "add tasks to the plan", "break this into tasks", "create a todo list", "what are the steps", "implementation steps", "task breakdown", or any request to turn a plan into actionable work items. Also triggers when the user references a plan document and asks for next steps, phases, or a checklist. Do NOT use for actually implementing the tasks — this skill only produces the todo list
---

# Add Todos

You read a reviewed plan document and append a comprehensive, phased todo list that captures every piece of work needed to execute the plan. You do not implement anything — you produce the roadmap.

## Why This Matters

A plan describes *what* and *why*. The todo list bridges the gap to *how* and *in what order*. A good todo list means a developer can pick up the first unchecked item and start working without re-reading the entire plan. A bad one is either too vague ("implement the feature") or too granular ("create the variable"). You're aiming for the sweet spot: each task is a single, concrete unit of work that a developer can complete and check off in one focused session.

## Workflow

### Step 1 — Understand the Plan

Read the entire plan document carefully. Identify:

- The goal and scope of the work
- The systems, files, and components involved
- The dependencies between different parts of the plan
- Any constraints, risks, or sequencing requirements mentioned
- The associated research document(s) if referenced — read them too for context on the codebase

### Step 2 — Write the Tasks

Each task should answer: *what exactly do I do, and where?*

Good tasks:
- Reference specific files, functions, or modules when known from the plan or research
- Are completable in one focused session (roughly 15 minutes to 2 hours of work)
- Have a clear "done" state — you know when it's finished
- Include the *why* briefly if the reason isn't obvious from context

Bad tasks:
- Vague buckets: "handle edge cases" (which ones?)
- Too granular: "add import statement to line 4" (that's part of a larger task)
- Missing context: "update the handler" (which handler? to do what?)

### Step 3 — Append to the Plan

Add the todo list at the end of the plan document under a clear heading. Use checkbox syntax so tasks can be tracked. Save the file.

### Format

```markdown
---

## Todo

### Phase 1: [Phase Name]
[One sentence describing what this phase accomplishes and what state the system is in when it's done.]

- [ ] **[Task title]** — [What to do, referencing specific files/functions/modules. Why, if not obvious.]
- [ ] **[Task title]** — [Description]
- [ ] ...

### Phase 2: [Phase Name]
[One sentence.]

- [ ] ...

### Phase N: Validation & Cleanup
[One sentence.]

- [ ] ...
```

Rules:
- Use `---` horizontal rule before the Todo heading to visually separate it from the plan body
- Each phase gets a short sentence explaining its purpose and exit state
- Tasks use `- [ ]` checkbox syntax
- Task title is bolded, followed by a dash and the description
- Keep descriptions to one or two sentences — concise but unambiguous
- If a task depends on a specific prior task completing first, mention it: "*(after Task X in Phase 1)*"
- If tasks within a phase can be done in parallel, note it: "*(parallelizable with the task above)*"

## Important Behavioral Notes

- **Read the plan thoroughly before writing any tasks.** The todo list should reflect the plan's actual scope, not a generic implementation checklist.
- **Don't add work that isn't in the plan.** If you think something is missing, add a note at the end flagging it — don't silently expand scope.
- **Don't implement anything.** No code, no file creation beyond editing the plan document. The todo list is the deliverable.
- **Reference the research.** If a research document exists and was referenced in the plan, use it to make tasks more specific (e.g., referencing exact file names, function signatures, or patterns discovered during research).
- **Think about sequencing carefully.** A developer should be able to work through the list top to bottom without hitting a blocker caused by an out-of-order task.
- **Include validation tasks.** Every phase that changes behavior should have at least one task for verifying the change works. Don't lump all testing into a final phase — validate as you go.


## After adding todos

After adding all the todos to the plan, the user may want to annotate the new plan version. So, use the `/annotate plan-file.md` skill to serve the new document to the user and they can add more notes.

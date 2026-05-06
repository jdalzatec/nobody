# Nobody

Nobody is a structured agentic workflow that keeps humans in the loop. Its skills and instructions ensure you own the
architecture decisions. This workflow is based on
the [Boris Tane pattern](https://boristane.com/blog/how-i-use-claude-code), read more about it if you want to understand
the approach in depth.

Nobody provides a workflow for AI-assisted development:

```mermaid
flowchart LR
    R[research] --> A1[annotate]
    A1 --> OK1{approved?}
    OK1 -- no --> RV1[review] --> A1
    OK1 -- yes --> P[plan]
    P --> A2[annotate]
    A2 --> OK2{approved?}
    OK2 -- no --> RV2[review] --> A2
    OK2 -- yes --> T[add-todos]
    T --> A3[annotate]
    A3 --> OK3{approved?}
    OK3 -- no --> RV3[review] --> A3
    OK3 -- yes --> I[implement]
```

Each stage is a skill that handles a responsibility. As you can see, the key point is in the annotation cycle, this is
where the rigor comes in the human reviews and refines before moving forward.

## How it works

The moment you describe a feature or a problem, Nobody gets to work, but not by writing code.

First, it researches: mapping the codebase, tracing dependencies and call flows, and producing a written report you can actually read.

That report lands in an annotation viewer. You go through it, leave comments, correct anything off, and sign off when it reflects reality. Nobody then takes your notes and produces an implementation plan, concrete enough to follow.

You annotate the plan the same way. When you approve it, the plan becomes a phased task list with no ambiguity about what goes where. From that point, Nobody works through every task in order, no skipping, no improvising outside what you agreed on.

You reviewed it. You approved it. Nobody builds it.

## Skills

| Skill         | Trigger                                                   | What it does                                                                                                                                              |
|---------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **research**  | `/research`, "research", "investigate", "how does X work" | Deep-dives the codebase, maps dependencies, and call data flows. Produces a **viewable markdown report**, open it in the viewer to annotate.              |
| **plan**      | `/plan`, "plan this"                                      | Reads a research document and produces a **viewable implementation plan** with architectural breakdowns, ready for annotation before any code is written. |
| **annotate**  | `/annotate`, "annotate", "open the viewer"                | Launches the webapp via Docker on port 9303 and mounts a markdown file for annotation.                                                                    |
| **review**    | `/review`, "review my comments", "process the feedback"   | Reads CriticMarkup annotations from a document, addresses each one, and outputs a clean document with zero markup syntax.                                 |
| **add-todos** | `/add-todos`, "add todos", "break this into tasks"        | Converts a reviewed plan into a phased, TDD-ordered todo list. Each task specifies exactly what to do and where.                                          |
| **implement** | `/implement`, "implement it all"                          | Executes the plan's todo list end-to-end. Does not skip tasks or pause mid-flow.                                                                          |

## Philosophy

The role of a software engineer is being redefined. The role is not only about writing code, it bridges the gap between abstract problem-solving and concrete technical implementation. The modern software engineer is responsible for the entire lifecycle of a digital product from conceptual design to long-term maintenance.

Software engineers typically operate within a structured framework known as the SDLC. This iterative process ensures that software is developed systematically rather than haphazardly.

- Planning: Defining the "what" and "why" of the project.

- Design: Creating the technical blueprint.

- Development: The actual construction of the software.

- Testing: Verifying the software against the original requirements.

- Deployment: Releasing the product and fixing bugs or adding updates over time.

*Never let Claude write code until you’ve reviewed and approved a written plan.*

AI is fast at generating code, but fast is not the same as right. The biggest risk in AI-assisted development is not a bug, it is building the wrong thing confidently. Nobody is designed around that risk.

The workflow forces a pause at every meaningful decision: after research, after planning, after breaking work into tasks. Each pause is an annotation cycle where you read, question, and push back before anything is built. The AI cannot skip these gates. You own the direction. You own the architecture. You own the design.

This also keeps the mental model in your head, not just in the output. When you annotate a plan you are not just approving it you are understanding it, and making sure the AI understands it too, before any implementation effort is spent. That understanding is what lets you catch mistakes, redirect scope, and reason about the system long after the session ends.

Another important point, consist on making work digestible for the human: research, plans, and to-dos lists that are easy to read, easy to annotate, and easy to reason about. For large or open-ended tasks the workflow still applies, but the annotation cycles become more demanding, more steps, more energy, more precision required from you before anything moves forward.


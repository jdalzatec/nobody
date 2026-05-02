# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What this repo is

**Nobody** is a Claude Code plugin that ships a structured, human-in-the-loop workflow for AI-assisted development. It contains two distinct parts:

1. **`skills/`** — six prose-based skills (`research`, `plan`, `annotate`, `review`, `add-todos`, `implement`) that drive the workflow. These are markdown instruction files with frontmatter, not code. Editing them changes how Claude behaves at each stage.
2. **`webapp/`** — a React + TypeScript annotation viewer served via Docker on port 9303. This is the only stage of the workflow that runs real code; it renders the markdown artifacts produced by the skills and lets the user write CriticMarkup annotations back to the source file through a Node.js read/write API.

The two parts are coupled only at one seam: the `annotate` skill shells out to `skills/annotate/scripts/run-annotator.sh`, which pulls and runs the published Docker image (`jdalzatec/nobody-webapp:latest`) with the markdown file mounted read-write.

## The workflow (so changes don't break the contract)

The skills exchange information through markdown files in the user's working directory, not chat memory. Naming is timestamped:

- `research_YYYYMMDDHHMM.md` — created by `skills/research/scripts/new-research-name.sh`
- `plan_YYYYMMDDHHMM.md` — created by `skills/plan/scripts/new-plan-name.sh`
- The `add-todos` skill **appends** its todo list to the same `plan_*.md` file rather than creating a new file
- The webapp persists annotations back into whichever file is mounted, in CriticMarkup syntax (`{==text==}{>>comment<<}`)
- The `review` skill rewrites annotated files in place, stripping the markup

Skill handoff chain (each skill ends by invoking the next):

```
research → /annotate
review   → /annotate
plan     → /annotate
add-todos → /annotate
implement → (terminal, calls nothing)
```

`implement` is the only skill explicitly forbidden from invoking other skills. It is also the only skill that touches production code; everything upstream is documentation-only.

Two rules baked into the skills that are easy to violate by accident when editing them:

- **Plans must not contain open questions for the user.** The `plan` skill resolves ambiguity via `AskUserQuestion` *before* writing, and the same applies to `review` for ambiguous annotations.
- **Phases in a plan must not contain `git commit` or `git push` steps.** Git operations are reserved for the user. Guard validation, linting, typechecking, and tests are fine.

## Webapp commands

All webapp commands run from `webapp/`:

```bash
npm run dev          # Vite dev server (frontend)
npm run dev:api      # Node.js file API on port 3001 (FILE_PATH defaults to ./file.md)
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b --noEmit
npm run lint         # ESLint, --max-warnings 0
npm run lint:fix
npm run lint:css     # Stylelint over src/**/*.css
npm run format       # Prettier over the whole tree
npm run format:check
npm run test         # Vitest, single run
npm run test:watch
```

Run a single test file: `npx vitest run src/lib/annotation-ops.test.ts`
Run a single test by name: `npx vitest run -t "name pattern"`

## Webapp architecture

The frontend renders a markdown file fetched from `/api/file` (proxied to the Node API on port 3001) and lets the user select text to create CriticMarkup annotations.

```
webapp/
├── src/
│   ├── App.tsx                      # Top-level layout: viewer + sidebar + connectors
│   ├── components/
│   │   ├── MarkdownViewer/          # react-markdown + remark-gfm + rehype-raw rendering
│   │   ├── AnnotationSidebar/       # Sidebar panels per annotation
│   │   ├── AnnotationConnectors/    # SVG lines linking text spans to sidebar items
│   │   ├── AnnotationPopover/       # On-selection comment composer
│   │   └── MermaidBlock/            # Mermaid diagram renderer
│   ├── hooks/
│   │   ├── useAnnotations/          # Load/save annotations against the API
│   │   └── useAnnotationLayout/     # Position connectors and sidebar entries
│   └── lib/
│       ├── api.ts                   # GET/PUT /api/file
│       ├── remark-critic-markup.ts  # Parses {==text==}{>>comment<<} into AST nodes
│       ├── rehype-source-positions.ts # Tags rendered nodes with source offsets
│       ├── annotation-ops.ts        # Insert/remove CriticMarkup at source offsets
│       ├── source-search.ts         # Locate annotation targets in source text
│       ├── selection-validator.ts   # Validate user text selections
│       ├── dom-highlight.ts         # Apply visual highlights to rendered DOM
│       └── clipboard.ts             # Copy-selected-text helper
└── server/
    └── api.mjs                      # 45-line Node http server: GET/PUT /api/file
```

Key data flow:

1. `useAnnotations` hook fetches the markdown via `lib/api.ts → GET /api/file`.
2. `MarkdownViewer` renders it with the `remark-critic-markup` and `rehype-source-positions` plugins so each rendered node knows its byte offset in the source.
3. When the user selects text, `AnnotationPopover` collects a comment and `lib/annotation-ops.ts` inserts the CriticMarkup pair at the correct source offset.
4. The mutated source is persisted via `PUT /api/file`, which the Node server writes to `$FILE_PATH` (defaults to `/data/file.md` in the Docker container, `./file.md` in dev).

The server is intentionally minimal: read/write a single file, no auth, no multi-file support. It runs inside the Docker image alongside an Nginx serving the built frontend (`nginx.conf`).

## Quality gates

Lefthook runs the gates automatically:

- **pre-commit** (per `lefthook.yml`): `webapp-lint`, `webapp-format` (Prettier check), `webapp-css` (Stylelint)
- **pre-push**: `webapp-typecheck`, `webapp-test`

CI runs the same checks on every push and PR to `main`, and publishes a multi-arch Docker image (`linux/amd64`, `linux/arm64`) on merge.

## Skill-editing tips

When modifying a `skills/*/SKILL.md`:

- The frontmatter `description` is what Claude Code uses to decide when to trigger the skill. Keep it explicit about triggers and anti-triggers.
- Each skill is meant to be **narrow**. The contract between skills is the file artifacts in the cwd, not in-conversation state. Don't add cross-skill coordination beyond the existing handoff calls.
- The `implement` skill's "do not invoke other skills" rule is load-bearing — it is what makes implementation a single mechanical pass. Don't relax it.
- The annotation viewer is a single-instance container named `nobody`. The `SessionEnd` hook in `hooks/hooks.json` runs `docker stop nobody`, so anything that changes the container name must update both files.

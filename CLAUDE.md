# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What this repo is

**Nobody** is a Claude Code plugin that ships a structured, human-in-the-loop workflow for AI-assisted development. It contains two distinct parts:

1. **`skills/`** — six prose-based skills (`research`, `plan`, `annotate`, `review`, `add-todos`, `implement`) that drive the workflow. These are markdown instruction files with frontmatter, not code. Editing them changes how Claude behaves at each stage.
2. **`webapp/`** — a React + TypeScript annotation viewer served via Docker on port 9303. This is the only stage of the workflow that runs real code; it renders the markdown artifacts produced by the skills and lets the user write CriticMarkup annotations back to the source file through a Node.js read/write API.

The two parts are coupled only at one seam: the `annotate` skill shells out to `skills/annotate/scripts/run-annotator.sh`, which runs the published Docker image (`jdalzatec/nobody-webapp:latest`) with the document's **parent directory** mounted read-write.

The container is **shared across Claude sessions**. One instance named `nobody` serves every open document; it is started on the first `/annotate`, reused afterwards, and stopped only when the last session using it ends.

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
npm run dev:api      # Node.js API on port 3001 against the dev-state/dev-projects fixtures
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

The frontend lists every open document in a left rail, renders the selected one (fetched from `/api/docs/:id`, proxied to the Node API on port 3001), and lets the user select text to create CriticMarkup annotations. The active document lives in the URL as `/d/:id`.

```
webapp/
├── src/
│   ├── App.tsx                      # Rail + viewer + sidebar; /d/:id routing
│   ├── components/
│   │   ├── DocRail/                 # Left column: open docs grouped by directory
│   │   ├── MarkdownViewer/          # react-markdown + remark-gfm + rehype-raw rendering
│   │   ├── AnnotationSidebar/       # Sidebar panels per annotation
│   │   ├── AnnotationConnectors/    # SVG lines linking text spans to sidebar items
│   │   ├── AnnotationPopover/       # On-selection comment composer
│   │   └── MermaidBlock/            # Mermaid diagram renderer
│   ├── hooks/
│   │   ├── useDocs/                 # Fetch the open-document list
│   │   ├── useAnnotations/          # Load/save annotations against the API
│   │   └── useAnnotationLayout/     # Position connectors and sidebar entries
│   └── lib/
│       ├── api.ts                   # GET /api/docs, GET/PUT /api/docs/:id
│       ├── remark-critic-markup.ts  # Parses {==text==}{>>comment<<} into AST nodes
│       ├── rehype-source-positions.ts # Tags rendered nodes with source offsets
│       ├── annotation-ops.ts        # Insert/remove CriticMarkup at source offsets
│       ├── source-search.ts         # Locate annotation targets in source text
│       ├── selection-validator.ts   # Validate user text selections
│       ├── dom-highlight.ts         # Apply visual highlights to rendered DOM
│       └── clipboard.ts             # Copy-selected-text helper
├── dev-state/registry.json          # Committed dev fixture (machine-independent ids)
├── dev-projects/devproject01/       # Fixture documents for `npm run dev:api`
└── server/
    ├── api.mjs                      # Registry-driven http server, three routes
    └── registry-cli.mjs             # Registry read/write CLI, also runs in-container
```

Key data flow:

1. `useDocs` fetches `GET /api/docs`; `App.tsx` reads the active id from `/d/:id`.
2. `useAnnotations` fetches that document via `lib/api.ts → GET /api/docs/:id`.
3. `MarkdownViewer` renders it with the `remark-critic-markup` and `rehype-source-positions` plugins so each rendered node knows its byte offset in the source.
4. When the user selects text, `AnnotationPopover` collects a comment and `lib/annotation-ops.ts` inserts the CriticMarkup pair at the correct source offset.
5. The mutated source is persisted via `PUT /api/docs/:id`, which the Node server writes to `$PROJECTS_DIR/<dirId>/<filename>`.

### The registry

`~/.nobody/registry.json` on the host is the source of truth for which documents are open and which sessions own them. It is mounted read-only at `/state` and **re-read on every request**, which is why a document added to an already-mounted directory appears without restarting the container.

Rules that are load-bearing:

- **The registry stores identity and ownership only, never derived data.** A document's rail title is derived from its first `# heading` at read time. Caching it would go stale the moment `/review` rewrites the document.
- **Only the document's immediate parent directory is mounted** — never the git root, never `$HOME`. `run-annotator.sh` refuses dangerous parents outright.
- **The registry can go stale but never wrong.** A deleted document is filtered out of `GET /api/docs` at read time and pruned from the JSON on the next mutation.
- **Liveness is probed on the host, not in the CLI.** The CLI container has no host PID namespace and no view of the project directories, so `run-annotator.sh` and `session-end.sh` compute the verdicts and pass `--dead` / `--missing`.
- `resolveDoc` in `api.mjs` is the security boundary: realpath containment, 404/400/403/410. `PUT` returns 410 rather than recreating a deleted file.

The server has no auth and is published on `127.0.0.1` only. It runs inside the Docker image alongside an Nginx serving the built frontend (`nginx.conf`).

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
- The annotation viewer is a single shared container named `nobody`, used by **all** concurrent Claude sessions. The `SessionEnd` hook in `hooks/hooks.json` calls `skills/annotate/scripts/session-end.sh`, which deregisters the closing session and stops the container **only when no session is left**. Never make that hook stop the container unconditionally — that is the bug it exists to fix.
- `run-annotator.sh` and `session-end.sh` share `skills/annotate/scripts/registry-lib.sh`. Container name, port, image, and state dir are defined there once; changing any of them means changing that file, not the two scripts.
- `registry_cli` must pass `--entrypoint node` to `docker run`. The image's default entrypoint starts nginx in the foreground and would hang instead of running the CLI.
- The launcher reuses the running container whenever its mounts already cover what is needed. Only a **new directory** forces a recreate, so adding a document to a known project must never restart it.

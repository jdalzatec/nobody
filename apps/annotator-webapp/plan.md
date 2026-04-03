# Annotator webapp: Ant Design migration, colocated tests, Vite 8

Execution plan only — **do not treat as implemented** until the work is merged and verified.

## Table of contents

1. [Goals](#goals)
2. [Non-goals](#non-goals)
3. [Current inventory](#current-inventory-baseline)
4. [Phase A — Vite 8](#phase-a--upgrade-to-vite-8)
5. [Phase B — Ant Design, remove Tailwind / shadcn](#phase-b--adopt-ant-design-and-remove-tailwind--shadcn)
6. [Phase C — Colocate tests](#phase-c--colocate-tests-with-source)
7. [Detailed todo list](#detailed-todo-list)
8. [Acceptance criteria](#acceptance-criteria)
9. [Risks and notes](#risks-and-notes)
10. [Suggested commits](#suggested-commit-breakdown-optional)

## Goals

- Replace **Tailwind CSS** and **shadcn-style** UI primitives with [Ant Design](https://ant.design/) (`antd`).
- Remove Tailwind, `@tailwindcss/vite`, `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, and the local `src/components/ui/*` layer (and `src/lib/utils.ts` if nothing else uses `cn()`).
- **Colocate** Vitest specs beside the modules they cover; retire the top-level `tests/` folder for spec files (keep one shared setup file elsewhere).
- Upgrade **Vite to major version 8** (from current `^6.x`), with `@vitejs/plugin-react` and Vitest versions aligned to that stack.

## Non-goals

- Changing annotator **behavior**, **data models** (`src/types.ts`), or **`useAnnotations` / `range-utils`** logic except where styling or bundling forces a small adjustment.
- Rewriting tests’ **AAA** structure (Arrange / Act / Assert); only paths and selectors may change when swapping UI libraries.
- Monorepo-wide doc rewrites unless CI or scripts reference old paths.

## Current inventory (baseline)

| Area           | Location / notes                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Vite           | `vite.config.ts` — `react()` + `@tailwindcss/vite`                                                                           |
| Vitest         | `vitest.config.ts` — `setupFiles: ["tests/setup.ts"]`; default `include` discovers `tests/**/*.test.*`                       |
| Tailwind entry | `src/App.css` — `@import "tailwindcss"`, base reset, `@apply` under `.markdown-body`, `.annotation-highlight`                |
| shadcn-like UI | `src/components/ui/button.tsx` (CVA + Tailwind), `card.tsx`, `textarea.tsx`; `src/lib/utils.ts` (`cn`)                       |
| Feature UI     | `App.tsx`, `AnnotationPopover.tsx`, `AnnotationSidebar.tsx`, `MarkdownViewer.tsx`, `MermaidBlock.tsx` — Tailwind `className` |
| Hooks / utils  | `src/hooks/useAnnotations.ts`, `src/utils/range-utils.ts`                                                                    |
| Tests          | `tests/*.test.{ts,tsx}` importing `../src/...`                                                                               |
| Docker         | `Dockerfile` runs `npm test && npm run build` — test discovery must stay valid after moves                                   |

---

## Phase A — Upgrade to Vite 8

1. **Node**: Confirm the runtime matches Vite 8 requirements (see [Vite changelog / migration guide](https://vitejs.dev/guide/migration.html) for the 8.x line).
2. **Dependencies** (`package.json`):
   - `vite` → `^8.x`
   - `@vitejs/plugin-react` → version whose peer range supports Vite 8
   - `vitest` → version compatible with Vite 8 (resolve peer warnings after `npm install`)
3. **Config**: Review `vite.config.ts` for deprecated or renamed options; keep Tailwind plugin until Phase B if you stage phases separately.
4. **Verify**: `npm run dev` (smoke), `npm run build`, `npm test`, `npm run typecheck`.
5. **Lockfile**: Regenerate `package-lock.json` and fix any transitive conflicts.

_Sequencing_: Prefer **Phase A as its own commit** so bundler regressions are easy to bisect. Alternatively merge A+B on one branch but keep commits separate.

---

## Phase B — Adopt Ant Design and remove Tailwind / shadcn

Follow [Ant Design React getting started](https://ant.design/docs/react/getting-started) for the `antd` major you pin (e.g. 5.x or 6.x); verify **React 19** compatibility in that release’s docs or issue tracker.

### B.1 Dependencies

- **Add**: `antd`; add `@ant-design/icons` when replacing `lucide-react` (e.g. close icon on the annotation popover).
- **Remove**: `tailwindcss`, `@tailwindcss/vite`, `tailwind-merge`, `clsx`, `class-variance-authority`, `lucide-react` after all usages are gone.

### B.2 Application shell

- Wrap the app in `ConfigProvider` (in `src/main.tsx` or top of `App.tsx`) for theme, locale, and density.
- Import Ant Design styles per current docs (CSS-in-JS is default in modern `antd`; avoid duplicating legacy global CSS unless required).

### B.3 Component mapping

| Current                      | Ant Design direction                                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button` + CVA variants      | `Button` (`type`, `danger`, `size`, `ghost`)                                                                                                                                                         |
| `Textarea`                   | `Input.TextArea`                                                                                                                                                                                     |
| `Card` + `CardContent`       | `Card` with `styles` / `bodyStyle` or inner `Space`                                                                                                                                                  |
| `AnnotationPopover`          | Keep **absolute positioning** + `style={{ top, left }}`; inner UI: `Card`, `Input.TextArea`, `Button`, `CloseOutlined` (or `Modal` only if you intentionally change UX — out of scope unless agreed) |
| `AnnotationSidebar`          | `List` + `Card`, or stacked `Card`s with `Typography` for quote + comment                                                                                                                            |
| `App` loading / error / grid | `Spin`, `Result` or `Alert`; layout via `Row`/`Col` or `Flex`                                                                                                                                        |
| `MermaidBlock`               | Success: wrapper `div` + minimal CSS; error: `Alert` or `<pre>` with token-aligned colors                                                                                                            |

### B.4 Global CSS without Tailwind

- **Rewrite `src/App.css`**:
  - Remove `@import "tailwindcss"` and all `@apply` blocks.
  - Re-express `.markdown-body` rules as **plain CSS** targeting `react-markdown` output (same selectors as today).
- **`.annotation-highlight`**: plain CSS (background, border) aligned with the light theme; optionally derive colors from CSS variables if you wire `ConfigProvider` theme to `:root`.

### B.5 Cleanup

- Delete `src/components/ui/*` and `src/lib/utils.ts` if unused.
- Remove `tailwindcss()` from `vite.config.ts`.
- Update `.gitignore` if anything Tailwind-specific was added; ensure `dist/` remains ignored per [Node.gitignore](https://github.com/github/gitignore/blob/main/Node.gitignore) conventions.

### B.6 Tests during Phase B

- Update RTL queries if roles/labels change (Ant components expose standard roles; use `getByRole` / `getByLabelText`).
- Re-run full suite after each logical chunk (popover, sidebar, app shell).

### B.7 Verification

- Manual: loading, error, grid + markdown column + sidebar, text selection → popover → save → highlight + sidebar card, mermaid success and failure.
- `npm run typecheck`, `npm test`, `npm run build`, and **`docker compose build`** (tests are a gate in `Dockerfile`).

---

## Phase C — Colocate tests with source

### C.1 Ordering choice

- **After Phase B (recommended)**: One migration of paths and imports; `vitest.config` updated once.
- **Before Phase B**: Smaller Ant diff in tests (imports like `./AnnotationPopover`), but you touch every spec twice if paths are unstable.

### C.2 Target layout

| From                               | To                                          |
| ---------------------------------- | ------------------------------------------- |
| `tests/App.test.tsx`               | `src/App.test.tsx`                          |
| `tests/AnnotationPopover.test.tsx` | `src/components/AnnotationPopover.test.tsx` |
| `tests/AnnotationSidebar.test.tsx` | `src/components/AnnotationSidebar.test.tsx` |
| `tests/MarkdownViewer.test.tsx`    | `src/components/MarkdownViewer.test.tsx`    |
| `tests/MermaidBlock.test.tsx`      | `src/components/MermaidBlock.test.tsx`      |
| `tests/useAnnotations.test.tsx`    | `src/hooks/useAnnotations.test.tsx`         |
| `tests/range-utils.test.ts`        | `src/utils/range-utils.test.ts`             |

Optional alternative: `ComponentName/__tests__/ComponentName.test.tsx` — use one convention across the package.

### C.3 Global test setup

- Move `tests/setup.ts` → e.g. `src/test/setup.ts` or `vitest.setup.ts` at package root.
- Update `vitest.config.ts`:
  - `setupFiles` → new path
  - Set explicit `include: ["src/**/*.{test,spec}.{ts,tsx}"]` (and `exclude` for `node_modules`, `dist`) so discovery is predictable

### C.4 TypeScript

- `tsconfig.json`: `include` should cover `src` only (or `src` + setup path); remove `tests` if the directory is deleted.

### C.5 Imports

- Replace `../src/...` with relative imports from the colocated file (e.g. `import { App } from "./App"` in `App.test.tsx`).
- Mock paths in `vi.mock(...)` must be updated to match new locations.

### C.6 Repo references

- Grep for `apps/annotator-webapp/tests`, CI workflows, skills, or docs that mention the old test path; update or remove.

### C.7 Cleanup

- Remove empty `tests/` directory.

---

## Detailed todo list

Granular checklist for implementation. Check items off as you complete them.

### Phase A — Vite 8 ✅

- [x] Confirm local and CI Node.js meet Vite 8 minimum (see [Vite migration guide](https://vitejs.dev/guide/migration.html) for 8.x).
- [x] Bump `vite` to `^8.x` in `package.json`.
- [x] Bump `@vitejs/plugin-react` to a major compatible with Vite 8; resolve peer warnings.
- [x] Bump `vitest` to a version compatible with Vite 8; align any `@vitest/*` packages if present.
- [x] Run `npm install` in `apps/annotator-webapp`; commit updated `package-lock.json` after conflicts are resolved.
- [x] Review Vite 8 migration notes; update `vite.config.ts` for renamed options, defaults, or removed APIs.
- [x] Run `npm run typecheck`; fix any tooling-related TypeScript errors.
- [x] Run `npm run build`; fix bundler errors.
- [x] Run `npm test`; fix runner/config issues (not UI selectors yet unless already failing).
- [x] Smoke `npm run dev` (app loads, HMR works).

### Phase B — Ant Design, remove Tailwind / shadcn ✅

#### B.0 Dependencies and compatibility

- [x] Pin `antd` version with documented **React 19** support; add to `dependencies`.
- [x] Add `@ant-design/icons` to `dependencies`.
- [x] Run `npm install`; verify lockfile and no unexpected peer warnings.

#### B.1 App entry and `ConfigProvider`

- [x] Import Ant Design styles / setup per current `antd` + Vite docs (entry: typically `src/main.tsx`).
- [x] Wrap the tree in `ConfigProvider` (from `main.tsx` or top of `App.tsx`) with theme tokens as needed.
- [x] Optionally set `locale` on `ConfigProvider` if you standardize on non-default locale later (optional for this migration).

#### B.2 `AnnotationPopover.tsx`

- [x] Replace `./ui/button` with `antd` `Button` (`type`, `size`, `disabled` for save when empty comment).
- [x] Replace `./ui/textarea` with `Input.TextArea`; preserve `ref`, focus on mount, `value`, `onChange`, `placeholder`, `rows`.
- [x] Replace `lucide-react` `X` with `@ant-design/icons` (e.g. `CloseOutlined`); keep dismiss `aria-label` / keyboard usability.
- [x] Replace Tailwind on the floating container with Ant layout (`Card`, `Space`, `Flex`) plus `style={{ top, left }}` and appropriate `zIndex`; preserve click-outside-to-cancel behavior.
- [x] Verify Escape cancels and Meta/Ctrl+Enter saves.

#### B.3 `AnnotationSidebar.tsx`

- [x] Remove `./ui/card`; use `antd` `Card` (and/or `List`) for each annotation.
- [x] Replace Tailwind typography with `Typography`, `Space`, or `Card` `styles` / `bodyStyle`.
- [x] Confirm `annotations.length === 0` still yields `null`.

#### B.4 `App.tsx`

- [x] Replace loading UI with `Spin` (or equivalent); keep “Loading…” visible or use `tip`.
- [x] Replace error UI with `Result`, `Alert`, or `Typography`; surface the same error string from fetch failure.
- [x] Replace main layout Tailwind with `Row`/`Col`, `Flex`, and/or plain CSS grid in `App.css`; preserve two-column layout and readable max width.
- [x] Keep `ref={containerRef}`, `onMouseUp={handleMouseUp}`, and `markdown-body` class on the markdown column.

#### B.5 `MermaidBlock.tsx`

- [x] Replace fallback `pre`/`code` Tailwind with `Alert` or scoped classes in `App.css`.
- [x] Replace success wrapper Tailwind with plain CSS or Ant wrappers; keep SVG overflow/scaling reasonable.

#### B.6 `MarkdownViewer.tsx`

- [x] Confirm non-mermaid `code` still forwards `className` / props for syntax highlighting classes from `react-markdown`.
- [x] Smoke-test GFM: tables, lists, links, blockquote after global CSS change.

#### B.7 `src/App.css`

- [x] Remove `@import "tailwindcss"` and `@layer base` block; add minimal global `body` rules if Ant reset does not cover your needs.
- [x] Port `.markdown-body h1`–`h6` from `@apply` to plain CSS.
- [x] Port `.markdown-body` rules for `p`, `a`, `hr`, `blockquote`, `table`, `th`/`td`, `code`, `pre`, `ul`/`ol`, `li`.
- [x] Rewrite `.annotation-highlight` without Tailwind `theme()` / `@apply`.
- [x] Remove dead rules and verify no remaining `@apply`.

#### B.8 Vite, deps, and file deletion

- [x] Remove `tailwindcss` and `@tailwindcss/vite` from `devDependencies`.
- [x] Remove `tailwind-merge`, `clsx`, `class-variance-authority`, `lucide-react` from `dependencies` when unused.
- [x] Remove `tailwindcss` import and plugin from `vite.config.ts`.
- [x] Delete `src/components/ui/button.tsx`, `card.tsx`, `textarea.tsx` and remove empty `ui/` folder.
- [x] Delete `src/lib/utils.ts` if `cn` is unused; remove empty `lib/` if applicable.
- [x] Run `npm install`; confirm `npm ls tailwindcss` reports nothing for this package.

#### B.9 Tests and RTL (during / after B.2–B.5)

- [x] Update any broken queries in `tests/*` (or colocated specs if Phase C is done) for Ant roles/labels.
- [x] Re-run `npm test` after popover, sidebar, and app shell migrations.

#### B.10 Phase B verification

- [x] Manual pass: loading, error, layout, selection → popover → save, highlight + sidebar, mermaid OK + mermaid error path.
- [x] Run `npm run typecheck`, `npm test`, `npm run build`.
- [x] Run `docker compose build` for `annotator-webapp` (Dockerfile runs tests + build).

### Phase C — Colocate tests ✅

#### C.0 Prerequisite

- [x] Complete Phase B (recommended) so selectors and imports are stable before moving files.

#### C.1 Shared setup

- [x] Create `src/test/setup.ts` (or root `vitest.setup.ts`) with contents from `tests/setup.ts`.
- [x] Point `vitest.config.ts` `setupFiles` at the new file.
- [x] Set `test.include` to `src/**/*.{test,spec}.{ts,tsx}` and `exclude` `node_modules`, `dist` as needed.

#### C.2 Move each spec and fix imports

- [x] `tests/App.test.tsx` → `src/App.test.tsx`; imports `./App`; fix `vi.mock` paths if any.
- [x] `tests/AnnotationPopover.test.tsx` → `src/components/AnnotationPopover.test.tsx`; fix imports and mocks.
- [x] `tests/AnnotationSidebar.test.tsx` → `src/components/AnnotationSidebar.test.tsx`; fix imports and mocks.
- [x] `tests/MarkdownViewer.test.tsx` → `src/components/MarkdownViewer.test.tsx`; fix imports and mocks.
- [x] `tests/MermaidBlock.test.tsx` → `src/components/MermaidBlock.test.tsx`; fix imports and mocks.
- [x] `tests/useAnnotations.test.tsx` → `src/hooks/useAnnotations.test.tsx`; fix imports and mocks.
- [x] `tests/range-utils.test.ts` → `src/utils/range-utils.test.ts`; fix imports and mocks.

#### C.3 TypeScript config

- [x] Update `tsconfig.json` `include`: cover `src` (and `src/test` if not under `src` glob); remove `tests` when folder is gone.

#### C.4 Repo and cleanup

- [x] Delete `tests/setup.ts` and the `tests/` directory.
- [x] Grep monorepo for `annotator-webapp/tests`, `apps/annotator-webapp/tests`, or `tests/setup.ts`; update CI, skills, scripts, docs.

#### C.5 Phase C verification

- [x] Run `npm test` and `npm run typecheck` from `apps/annotator-webapp`.

### Final gate (all phases) ✅

- [x] Confirm every item in [Acceptance criteria](#acceptance-criteria) below.

---

## Acceptance criteria

- [x] No `tailwindcss` / `@tailwindcss/vite` in this package; no `src/components/ui` shadcn-style layer.
- [x] UI built with `antd` (and `@ant-design/icons` if used); feature parity with pre-migration behavior.
- [x] `npm run dev`, `npm run build`, `npm test`, `npm run typecheck` succeed on the agreed Node version.
- [x] `vite` is `^8.x` with a compatible `@vitejs/plugin-react` and Vitest.
- [x] All specs colocated beside implementation; single global setup file referenced in `vitest.config.ts`.
- [x] `docker compose build` succeeds (tests + production build in image).

## Risks and notes

- **React 19 + antd**: Confirm support matrix; upgrade `antd` if needed before merging.
- **jsdom**: Prefer accessible queries; use `waitFor` for async Ant internals where needed.
- **Markdown CSS**: Porting `.markdown-body` from `@apply` to plain CSS is the largest mechanical effort.
- **Bundle size**: `antd` + icons may change chunk sizes vs Tailwind tree-shaking; acceptable unless product caps bundle size.
- **ESLint**: If the project adds `eslint-plugin-testing-library` later, colocated `*.test.tsx` beside sources is standard.

## Suggested commit breakdown (optional)

1. `chore(annotator-webapp): upgrade vite to 8.x` (+ plugin / vitest alignment).
2. `feat(annotator-webapp): migrate UI to antd, remove tailwind` (+ `App.css` rewrite + delete `ui/` + deps).
3. `refactor(annotator-webapp): colocate vitest specs with source` (+ `vitest.config` + `tsconfig` + remove `tests/`).

This ordering keeps reviews reviewable and preserves a working tree between pushes if each commit is shippable.

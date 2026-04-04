# Plan: Vertically-Aligned Annotation Sidebar

## Goal

Instead of stacking notes sequentially in the sidebar, position each note card at the same vertical coordinate as its highlighted text. When cards would overlap (because two highlights are close together, or a card is tall), push the lower card down just enough to clear the one above — never overlap.

---

## Key Constraints

- The **page scrolls** (no inner scroll container). Note positions are expressed as offsets from the top of the sidebar element, which sits next to the markdown column in the grid.
- Card heights are **variable** (short comments vs. long ones).
- A note must never be **above** its highlight — only at or below it.
- Notes must never **overlap** each other.
- Positions must stay **in sync** when: a new annotation is added/removed, the window is resized, or a card's content changes height.

---

## Coordinate Model

The sidebar container will use `position: relative`. Each card will use `position: absolute; top: T` where `T` is calculated as:

```
T = highlight_top_relative_to_sidebar
  = highlight_element.getBoundingClientRect().top
  - sidebar_element.getBoundingClientRect().top
```

Both values are viewport-relative, so their difference is stable regardless of scroll position. This means **no scroll listener is needed** — the absolute `top` values are fixed in document space and scroll naturally with the page.

---

## Phase 1 — Measure Highlight Positions

**Goal:** For each saved annotation, find the vertical position of its highlight mark in the DOM and express it as an offset from the sidebar container's top.

### Steps

1. In `useAnnotations` (or a new `useAnnotationLayout` hook), add a function `measureHighlightTops(): Map<string, number>`.
2. For each annotation, query `container.querySelector('[data-annotation-id="<id>"]')` to get the first `<mark>` element (a highlight may produce multiple marks if it crosses block boundaries; the first mark gives the top of the selection).
3. Compute `top = mark.getBoundingClientRect().top - sidebarRef.getBoundingClientRect().top`.
4. Return a map from `annotationId → top`.

### Notes

- The sidebar ref must be passed in or accessed from a shared ref.
- This function is **pure measurement** — no state, no side effects. It will be called at specific trigger points (Phase 4).

---

## Phase 2 — Collect Card Heights

**Goal:** Know the rendered height of each note card so the overlap resolver can compute how much vertical space each one occupies.

### Problem

Heights are only known after the cards are rendered in the DOM. This creates a dependency: we need heights to compute positions, but cards must be rendered to measure heights.

### Solution

Render all cards with `position: absolute` from the start (they will initially stack or be at `top: 0`). After the first render, measure their heights and compute correct positions. A brief layout jump on first appearance is acceptable.

### Steps

1. Add a `cardRefs` map (`annotationId → HTMLElement ref`) managed in the sidebar component or hook.
2. Use a `ResizeObserver` that watches all card elements.
3. On each observation, update a `cardHeights` state map (`annotationId → number`).
4. Whenever `cardHeights` changes, trigger a layout recomputation (Phase 3).

---

## Phase 3 — Overlap Resolution Algorithm

**Goal:** Given `highlightTops` (desired positions) and `cardHeights`, compute the actual `top` for each card such that no two cards overlap.

### Algorithm

```
Input:
  highlights: { id, highlightTop }[]  — sorted ascending by highlightTop
  cardHeights: Map<id, height>
  GAP = 8  — minimum pixels between cards

Output:
  positions: Map<id, top>

sorted = sort highlights by highlightTop ascending
cursor = 0  // tracks the bottom of the last placed card

for each annotation in sorted:
  desired = annotation.highlightTop
  actual  = max(desired, cursor)
  positions[annotation.id] = actual
  cursor  = actual + cardHeights[annotation.id] + GAP
```

### Properties

- A card is **never placed above its highlight** (`max(desired, cursor)` ensures this).
- Cards are **never overlapping** (cursor tracks the bottom of the previous card).
- The algorithm runs in O(n log n) due to the sort; measurement and rendering are the bottleneck.

### Edge Cases

- **Annotation with no rendered card yet** (height unknown): skip it in the layout pass until height is measured.
- **Annotation with no mark in DOM** (e.g., highlight was removed): skip it.
- **Two highlights at exactly the same top**: the second one is pushed down by the first card's height + GAP.

---

## Phase 4 — Wire Up Synchronization

**Goal:** Re-run measurement + layout at the right moments so positions are always correct.

### Trigger Points

| Event | Action |
|-------|--------|
| Annotation added | Re-measure highlight tops; layout runs after new card height is observed |
| Annotation removed | Remove from heights map; re-run layout |
| Window resized | Re-measure highlight tops (text reflow changes mark positions); re-run layout |
| Card height changed | `ResizeObserver` fires; re-run layout with updated height |

### Implementation

Create a `useAnnotationLayout` hook that:
1. Accepts `annotations`, `containerRef` (markdown column), `sidebarRef`.
2. Maintains `cardHeights: Map<string, number>` state.
3. Maintains `positions: Map<string, number>` state (output of Phase 3 algorithm).
4. Exposes `registerCard(id, el)` / `unregisterCard(id)` callbacks for cards to register their DOM nodes.
5. Internally runs a `ResizeObserver` over all registered card elements.
6. Internally attaches a `ResizeObserver` on `containerRef` (catches window resize and any content reflow in the markdown column).
7. Whenever heights or `annotations` change, re-measures highlight tops and re-runs the algorithm.

Using `ResizeObserver` on `containerRef` instead of `window.addEventListener('resize')` is more accurate because it fires when the element's size changes, not just when the window resizes.

---

## Phase 5 — Sidebar Rendering Changes

**Goal:** Change `AnnotationSidebar` from a flex stack to an absolutely-positioned layout.

### CSS Changes

```css
/* Before */
.annotation-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 2.5rem;
}

/* After */
.annotation-sidebar {
  position: relative;
  /* height is set dynamically via inline style to contain the last card */
}
```

The sidebar's grid cell must not stretch to match the markdown column height. Add `align-self: start` to `.annotation-sidebar` so the element's height is controlled by its content (the positioned cards).

### Component Changes

`AnnotationSidebar` receives, in addition to `annotations`:
- `positions: Map<string, number>` — computed top for each card
- `onCardMount(id, el)` / `onCardUnmount(id)` — callbacks to register card refs

Each card renders as:
```tsx
<div
  key={annotation.id}
  ref={(el) => el ? onCardMount(annotation.id, el) : onCardUnmount(annotation.id)}
  style={{
    position: 'absolute',
    top: positions.get(annotation.id) ?? 0,
    width: '100%',
  }}
>
  <Card>...</Card>
</div>
```

The sidebar container's height is set to `last_card_top + last_card_height` so the grid cell expands to contain all cards and the page can scroll to reach them.

---

## Phase 6 — Connector Lines

Draw a thin line from the highlighted text to its corresponding card in the sidebar. This helps the reader understand which card belongs to which highlight, especially when a card has been pushed below its highlight by the overlap resolver.

### Approach

Use a single `<svg>` element overlaid on top of the full `.app-layout` area (`position: absolute; inset: 0; pointer-events: none; overflow: visible`). For each annotation, draw one `<line>` or `<path>` from the right edge of the highlight mark to the left edge of its card.

### Coordinate Calculation

Both endpoints must be expressed in the same coordinate space (the SVG overlay's bounding box, which matches `.app-layout`):

- **Highlight endpoint**: `mark.getBoundingClientRect()` → right edge x, vertical midpoint y, adjusted by the overlay's own `getBoundingClientRect()` offset.
- **Card endpoint**: sidebar container left edge x, card's `top` (from Phase 3) + half card height, adjusted by the overlay's offset.

The layout hook (Phase 4) already has all this information, so the SVG data can be derived there and passed down as a `connectors: { id, x1, y1, x2, y2 }[]` prop.

### Styling

- Thin line, `1.5px` stroke, color `#6366f1` (same indigo as the card border), `opacity: 0.4` so it is present but not distracting.
- No arrowheads needed.

### Files Affected

| File | Change |
|------|--------|
| `src/hooks/useAnnotationLayout.ts` | Compute connector endpoints alongside positions; expose `connectors` array |
| `src/App.tsx` | Render SVG overlay inside `.app-layout` (needs `position: relative`); pass `connectors` to it |
| `src/components/AnnotationConnectors/AnnotationConnectors.tsx` | **New.** Thin component that renders the SVG overlay with one `<line>` per connector |
| `src/App.css` | Style the SVG overlay |

---

## Summary of Changes by File

| File | Change |
|------|--------|
| `src/hooks/useAnnotationLayout.ts` | **New.** Owns position computation, overlap resolution, connector endpoint calculation, ResizeObserver wiring; exposes `positions`, `connectors`, and card registration callbacks |
| `src/App.tsx` | Add `sidebarRef`; add `position: relative` to `.app-layout`; pass `positions` and card callbacks to `AnnotationSidebar`; render `AnnotationConnectors` with `connectors` |
| `src/components/AnnotationSidebar/AnnotationSidebar.tsx` | Switch from flex stack to absolute positioning; accept `positions` and registration callbacks as props |
| `src/components/AnnotationConnectors/AnnotationConnectors.tsx` | **New.** SVG overlay rendering one `<line>` per annotation |
| `src/App.css` | Update `.annotation-sidebar` styles; add SVG overlay styles |

No changes to `range-utils`, `useAnnotations`, `AnnotationPopover`, or `MarkdownViewer`.

---

## Implementation Order

1. Phase 1 + 3: Write the measurement function and overlap algorithm as pure functions (easy to unit-test with mocked rects).
2. Phase 2 + 4: Build `useAnnotationLayout` hook with ResizeObserver, synchronization, and connector endpoint computation.
3. Phase 5: Update `AnnotationSidebar` and `App.tsx` rendering.
4. Phase 6: Add `AnnotationConnectors` SVG overlay and wire `connectors` from the hook.

---

## Todo List

> **Validation gate commands** (run from `webapp/`):
> ```
> npm run typecheck   # TypeScript — zero errors required
> npm run lint        # ESLint — zero warnings required (--max-warnings 0)
> npm run lint:css    # Stylelint — zero warnings required
> npm run test        # Vitest — all tests must pass
> ```
> Every gate must pass before moving to the next phase.

---

### Phase 1 — Measure Highlight Positions
- [x] Create `src/hooks/useAnnotationLayout/useAnnotationLayout.ts` (and `index.ts`) as empty scaffolding
- [x] Write `measureHighlightTops(annotations, containerRef, sidebarRef): Map<string, number>` as a standalone pure function inside the hook file
  - [x] For each annotation, query `containerRef.current.querySelector('[data-annotation-id="<id>"]')` to find the first `<mark>`
  - [x] Compute `top = mark.getBoundingClientRect().top - sidebarRef.getBoundingClientRect().top`
  - [x] Skip annotations whose mark is not found in the DOM; exclude them from the returned map
  - [x] Return the complete `annotationId → top` map
- [x] Write unit tests for `measureHighlightTops` in `layout-utils.test.ts`:
  - [x] Returns empty map when `annotations` is empty
  - [x] Returns empty map when no matching `<mark>` elements exist in the container
  - [x] Returns correct top offset for a single annotation whose mark is present (mock `getBoundingClientRect` on mark and sidebar)
  - [x] Skips annotations whose mark is absent while still returning tops for those that are present

#### Phase 1 validation gate
- [x] `npm run typecheck` — passes with zero errors
- [x] `npm run lint` — passes with zero warnings
- [x] `npm run test` — all tests pass

---

### Phase 2 — Collect Card Heights
- [x] Inside `useAnnotationLayout`, declare `cardHeights: Map<string, number>` as a `useRef` (avoids re-render on measurement; layout recomputation is triggered explicitly)
- [x] Declare `cardRefs: Map<string, HTMLElement>` as a `useRef` to track registered card DOM nodes
- [x] Implement `registerCard(id: string, el: HTMLElement): void` — stores `el` in `cardRefs`, then triggers a layout recomputation
- [x] Implement `unregisterCard(id: string): void` — removes from `cardRefs` and `cardHeights`, then triggers a layout recomputation
- [x] Set up a single `ResizeObserver` instance (stored in a `useRef`) that:
  - [x] Observes every element currently in `cardRefs`
  - [x] On each callback entry, reads `entry.contentRect.height` and updates `cardHeights`
  - [x] After processing all entries, triggers a layout recomputation
- [x] Re-observe the correct set of elements whenever `registerCard` / `unregisterCard` is called (disconnect old observer, reconnect on current `cardRefs` values)
- [x] Clean up the `ResizeObserver` on hook unmount
- [x] Write unit tests for `registerCard` / `unregisterCard` in `useAnnotationLayout.test.tsx`:
  - [x] `registerCard` stores the element so it appears in subsequent layout computations
  - [x] `unregisterCard` removes the element and its height so it is excluded from subsequent layout computations
  - [x] `ResizeObserver` is disconnected on unmount (assert `.disconnect()` is called)

#### Phase 2 validation gate
- [x] `npm run typecheck` — passes with zero errors
- [x] `npm run lint` — passes with zero warnings
- [x] `npm run test` — all tests pass

---

### Phase 3 — Overlap Resolution Algorithm
- [x] Write `resolveOverlaps(highlightTops: Map<string, number>, cardHeights: Map<string, number>, gap?: number): Map<string, number>` as a pure function (no DOM access, no React state)
  - [x] Filter to only annotations present in both maps (skip those missing a height or a highlight top)
  - [x] Sort the filtered entries ascending by `highlightTop`
  - [x] Walk through sorted entries, maintaining a `cursor` (bottom of the last placed card)
  - [x] For each entry: `actual = max(highlightTop, cursor)`, store in output map, advance `cursor = actual + height + gap`
  - [x] Return the output `annotationId → top` map
- [x] Write unit tests for `resolveOverlaps` in `layout-utils.test.ts`:
  - [x] Empty input → returns empty map
  - [x] Single annotation → placed exactly at its highlight top
  - [x] Two annotations far apart → each placed at its own highlight top (no displacement)
  - [x] Two annotations whose highlights are closer than the first card's height → second is pushed below first card's bottom + gap
  - [x] Three annotations where the push on the second cascades to push the third further
  - [x] Two annotations at exactly the same highlight top → second is placed at `firstTop + firstHeight + gap`
  - [x] Annotation present in `highlightTops` but missing from `cardHeights` → excluded from output
  - [x] Custom `gap` value is respected in the spacing calculation

#### Phase 3 validation gate
- [x] `npm run typecheck` — passes with zero errors
- [x] `npm run lint` — passes with zero warnings
- [x] `npm run test` — all tests pass

---

### Phase 4 — Wire Up Synchronization
- [x] Add `sidebarRef: RefObject<HTMLElement>` as a parameter to `useAnnotationLayout` (alongside the existing `annotations` and `containerRef`)
- [x] Declare `positions: Map<string, number>` as a `useState` inside the hook (this is the value rendered components read)
- [x] Write `recomputeLayout(): void` as an internal function that:
  - [x] Calls `measureHighlightTops` (Phase 1)
  - [x] Calls `resolveOverlaps` with the current `cardHeights` ref (Phase 3)
  - [x] Calls `setPositions` with the result
- [x] Set up a `ResizeObserver` on `containerRef` to detect markdown column size changes (text reflow on window resize)
  - [x] On observation, call `recomputeLayout()`
  - [x] Clean up on unmount
- [x] Add a `useEffect` on `annotations` that calls `recomputeLayout()` whenever the annotations array changes (covers add and remove)
- [x] Expose from the hook: `{ positions, registerCard, unregisterCard }`
- [x] Write integration tests for `useAnnotationLayout` in `useAnnotationLayout.test.tsx` using `renderHook`:
  - [x] `positions` is empty on initial render when no annotations are provided
  - [x] `positions` updates after `registerCard` is called with a measured height and annotations are present
  - [x] Adding an annotation triggers `recomputeLayout` and updates `positions`
  - [x] Removing an annotation removes it from `positions`
  - [x] Both `ResizeObserver` instances (cards + container) are disconnected on unmount

#### Phase 4 validation gate
- [x] `npm run typecheck` — passes with zero errors
- [x] `npm run lint` — passes with zero warnings
- [x] `npm run test` — all tests pass

---

### Phase 5 — Sidebar Rendering Changes
- [x] **`App.tsx`**
  - [x] Add `sidebarRef = useRef<HTMLDivElement>(null)`
  - [x] Call `useAnnotationLayout({ annotations, containerRef, sidebarRef })` and destructure `{ positions, containerHeight, registerCard, unregisterCard }`
  - [x] Pass `sidebarRef`, `positions`, `containerHeight`, `registerCard`, `unregisterCard` as props to `<AnnotationSidebar>`
- [x] **`AnnotationSidebar.tsx`**
  - [x] Update the props interface to accept `sidebarRef`, `positions: Map<string, number>`, `containerHeight`, `registerCard`, `unregisterCard`
  - [x] Attach `sidebarRef` to the container `<div>`
  - [x] Container height computed in hook and passed as prop (avoids reading refs during render)
  - [x] Remove the early-return-null when `annotations` is empty (the container must still render to provide the ref)
  - [x] Wrap each `<Card>` in a `<div>` with `position: absolute`, `top: positions.get(id) ?? 0`, `width: 100%`
  - [x] Attach the wrapper `<div>`'s ref callback to call `registerCard(id, el)` on mount and `unregisterCard(id)` on unmount
- [x] **`App.css`**
  - [x] Replace `.annotation-sidebar` flex layout with `position: relative; align-self: start`
  - [x] Remove `padding-top` from `.annotation-sidebar` (vertical alignment is now handled by computed `top` values)
- [x] Update existing `AnnotationSidebar` tests in `AnnotationSidebar.test.tsx` to supply the new required props (`positions`, `containerHeight`, `registerCard`, `unregisterCard`, `sidebarRef`):
  - [x] Tests that previously checked for stacked card order remain valid but no longer assert on DOM order (cards are absolutely positioned)
  - [x] Add a test: renders the container element even when `annotations` is empty
  - [x] Add a test: each card wrapper receives the correct `top` style from the `positions` map
  - [x] Add a test: card ref callback calls `registerCard` on mount and `unregisterCard` on unmount

#### Phase 5 validation gate
- [x] `npm run typecheck` — passes with zero errors
- [x] `npm run lint` — passes with zero warnings
- [x] `npm run lint:css` — passes with zero warnings
- [x] `npm run test` — all tests pass

---

### Phase 6 — Connector Lines
- [x] **`useAnnotationLayout.ts`** — extend to compute connector endpoints
  - [x] Add `layoutRef: RefObject<HTMLElement>` (the `.app-layout` element) as a hook parameter so the overlay rect is accessible
  - [x] After `resolveOverlaps`, for each annotation in `positions`:
    - [x] Find the first `<mark>` element; compute `x1 = mark.getBoundingClientRect().right - overlayRect.left`, `y1 = mark vertical midpoint - overlayRect.top`
    - [x] Compute `x2 = sidebarRef.getBoundingClientRect().left - overlayRect.left`, `y2 = positions.get(id) + cardHeights.get(id) / 2`
  - [x] Store results in a `connectors: { id, x1, y1, x2, y2 }[]` state value
  - [x] Expose `connectors` from the hook
- [x] Write unit tests for connector computation in `useAnnotationLayout.test.tsx`:
  - [x] `connectors` is empty when `positions` is empty
  - [x] Connector endpoints are correctly offset relative to the layout element's bounding box (mock `getBoundingClientRect` on mark, sidebar, and layout elements)
  - [x] Annotations missing from `positions` (skipped by overlap resolver) produce no connector
- [x] **`src/components/AnnotationConnectors/AnnotationConnectors.tsx`** — new file
  - [x] Accept `connectors: { id, x1, y1, x2, y2 }[]` as props
  - [x] Render a `<svg>` with CSS class `annotation-connectors` (styles in App.css)
  - [x] For each connector, render `<line x1 y1 x2 y2 stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />`
  - [x] Return null if `connectors` is empty
  - [x] Create `src/components/AnnotationConnectors/index.ts` barrel export
- [x] Write unit tests for `AnnotationConnectors` in `AnnotationConnectors.test.tsx`:
  - [x] Renders nothing when `connectors` is empty
  - [x] Renders an SVG element when at least one connector is provided
  - [x] Renders one `<line>` per connector with the correct `x1`, `y1`, `x2`, `y2` attributes
- [x] **`App.tsx`**
  - [x] Add `layoutRef = useRef<HTMLDivElement>(null)` and pass it to `useAnnotationLayout`
  - [x] Attach `layoutRef` to the `.app-layout` `<div>` (add `ref={layoutRef}` and ensure `position: relative` is set)
  - [x] Render `<AnnotationConnectors connectors={connectors} />` inside `.app-layout`
- [x] **`App.css`**
  - [x] `.app-layout` has `position: relative`
  - [x] Added `.annotation-connectors` styles (absolute, inset 0, pointer-events none, overflow visible)

#### Phase 6 validation gate
- [x] `npm run typecheck` — passes with zero errors
- [x] `npm run lint` — passes with zero warnings
- [x] `npm run lint:css` — passes with zero warnings
- [x] `npm run test` — all tests pass

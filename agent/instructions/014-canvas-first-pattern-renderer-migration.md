# 014 Canvas-First Pattern Renderer Migration

## Status

Proposed architecture migration instruction for the main generated pattern renderer.

This instruction exists because the current DOM-cell pattern grid is becoming a runtime bottleneck for fast color hover, pin highlighting, zoomed inspection, and future larger/editable grids. It should be implemented only after the current diff zone has been reviewed, because recent work already adds view-mode panning behavior to the DOM grid.

## Goal

Migrate the main generated pattern work surface from a DOM-cell-first renderer to a canvas-first renderer while preserving Fundbeads' pattern contract, editing tools, zoom/pan behavior, color usage hover/pin behavior, export accuracy, and browser-local processing model.

The target is not a canvas-only app. The target is:

- Canvas-first main pattern rendering.
- React/DOM controls for toolbars, settings, color usage, statistics, dialogs, i18n, and accessibility helpers.
- Shared pure rendering geometry and hit-testing helpers.
- A renderer that remains deterministic for `52x52`, `64x64`, `78x78`, and future `100x100` grids.

## Role Team

Use the Fundbeads role prompts before implementation. If subagents are available, use them for focused review; otherwise perform the same checks in the implementation report.

- `agent/role-prompt/top-role.md`: confirm this is a renderer migration, not a visual redesign or feature expansion.
- `agent/role-prompt/business-analyst-role.md`: protect shipped workflows and keep the migration scoped to rendering/interactions.
- `agent/role-prompt/pattern-contract-role.md`: own `Pattern`, `PatternCell`, `ColorUsage`, row-major indexing, no-bead cells, usage totals, and edited effective-pattern behavior.
- `agent/role-prompt/palette-data-role.md`: verify all rendered colors resolve from the active `mard-221` palette and code labels remain stable.
- `agent/role-prompt/ui-designer-role.md`: preserve chart readability, axes, code legibility, zoom affordance, panning cursor states, and right-rail hover/pin feedback.
- `agent/role-prompt/performance-role.md`: own DOM reduction, canvas redraw strategy, color-group indexing, high-DPI rendering, and hover latency validation.
- `agent/role-prompt/security-role.md`: verify no upload, telemetry, server renderer, remote image processing, or remote palette source is introduced.
- `agent/role-prompt/qa-role.md`: define unit tests for geometry/hit testing/render contracts and manual checks for hover, pin, zoom, pan, and edit tools.
- `agent/role-prompt/documentation-steward-role.md`: update steady-state docs after behavior ships.
- `agent/role-prompt/reviewer-role.md`: perform final migration review before completion.

## Read Order

- `agent/role-prompt/common-protocol.md`
- `agent/role-prompt/role-router.md`
- This instruction
- `agent/instructions/003-pattern-grid-reference-view.md`
- `agent/instructions/013-pattern-grid-editing-tools.md`
- `docs/architecture.md`
- `docs/pattern-processing.md`
- `docs/design-rules.md`
- `docs/reference-feature-matrix.md`
- `frontend/src/App.tsx`
- `frontend/src/pattern-grid.tsx`
- `frontend/src/pattern-grid-board.tsx`
- `frontend/src/pattern-grid-geometry.ts`
- `frontend/src/pattern-grid-interaction.ts`
- `frontend/src/pattern-render-model.ts`
- `frontend/src/pattern-export.ts`
- `frontend/src/pattern-edit.ts`
- `frontend/src/color-usage-detail.tsx`
- `frontend/src/styles/pattern-grid.css`
- Related tests under `frontend/test/`
- `local/pixel-ref` as a local renderer interaction reference only

Do not copy unrelated `pixel-ref` product concepts, account behavior, save behavior, export gating, backend routes, brand names, or server semantics.

## Current State Check

Before implementation, inspect the current diff zone and reconcile it with this instruction.

As of this instruction, the working tree may already contain uncommitted pattern-grid changes that add view-mode panning behavior:

- `frontend/src/pattern-grid-interaction.ts` may define pan metrics and helpers such as `canPanPatternGrid` and `nextPatternGridPanScroll`.
- `frontend/src/pattern-grid.tsx` may keep a view-pan ref, `isPanning` state, and pointer handlers for view-mode drag panning.
- `frontend/src/pattern-grid-board.tsx` may pass `data-edit-tool` and `data-panning`.
- `frontend/src/styles/pattern-grid.css` may contain cursor or interaction styles for panning.
- Tests may already assert pan helper behavior and source-guard coverage.

Do not discard these changes. If they are present, either preserve them until the canvas migration replaces the DOM board, or migrate the same semantics into the canvas board in the same scope. If those changes are not present because they were committed or reverted before this instruction is implemented, read the current code and document the observed state in the implementation report.

Current shipped renderer assumptions:

- `PatternGrid` owns zoom, preview options, export buttons, edit toolbar wiring, keyboard cell focus, pointer editing, and color focus rules.
- `PatternGridBoard` renders one DOM element per bead cell and one axis cell per axis label.
- Color usage hover/pin currently mutates the board's focused color dataset and relies on CSS selector rules to hide non-focused cells.
- `pattern-export.ts` already contains a canvas renderer for exports.
- Image processing already uses canvas or `OffscreenCanvas`.
- Main-screen rendering is the part that is not canvas-first.

## Product Requirement

Replace the main generated pattern work surface with a canvas-first implementation that keeps:

- Full generated chart visible by default.
- Zoom-in and zoom-out controls.
- Ctrl + wheel and Command + wheel zoom while the pointer is over the pattern work surface.
- View-mode panning when zoomed or when the canvas exceeds the viewport.
- Paint, pick, erase, replace, undo, redo, and reset editing semantics from instruction `013`.
- Color usage hover preview.
- Color usage click-to-pin and click-again-to-unpin.
- Top, bottom, left, and right axes.
- Stronger 5/10 guide lines.
- MARD code labels inside cells when enabled.
- Readable text over light and dark bead colors.
- No-bead cell rendering.
- Browser-local processing and static deployment.

## Non-Goals

Do not implement these as part of the renderer migration unless the user creates a separate instruction:

- New authentication.
- Backend APIs.
- Remote rendering.
- Remote image upload.
- New export formats.
- New persistence UI.
- New palette data source.
- Blank canvas mode.
- Flood fill or magic wand.
- Product redesign unrelated to renderer behavior.

## Architecture Decision

Choose a layered canvas-first renderer instead of a canvas-only app or a patched CSS selector approach.

Options considered:

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Keep DOM grid and optimize CSS selectors | Lowest migration cost | Still carries thousands of DOM cells and style invalidation risk | Acceptable short-term fix only |
| Canvas-only board | Highest DOM reduction | Harder accessibility, controls, and UI integration | Too broad and brittle |
| Layered canvas board plus DOM controls | High performance, controlled migration, preserves React UI | Requires explicit hit testing and accessibility plan | Chosen |

The target board should use at least two canvas layers:

- Base canvas: complete pattern chart, axes, grid lines, bead colors, and code labels.
- Overlay canvas: hover color preview, pinned color highlight, active cell focus, brush preview, selection/pointer feedback, and transient edit affordances.

The base canvas should redraw only when the effective pattern, preview options, geometry, zoom scale, theme colors, or device pixel ratio changes. The overlay canvas should redraw during hover/pin/pointer feedback without forcing a full base redraw.

## Renderer Contract

Add or extract a renderer module with responsibilities similar to:

```ts
export type PatternCanvasRenderOptions = {
  showAxes: boolean;
  showGrid: boolean;
  showCodes: boolean;
  zoom: number;
  devicePixelRatio: number;
  highlightedColorCode?: string | null;
  pinnedColorCode?: string | null;
};

export type PatternCanvasHitResult = {
  cellIndex: number;
  x: number;
  y: number;
};
```

The exact API may differ, but it must preserve these responsibilities:

- Compute stable geometry from `Pattern`, preview options, base cell size, axis width, axis height, and zoom.
- Render the base chart into a canvas context.
- Render transient overlay state into a separate canvas context.
- Convert pointer coordinates to zero-based row-major `cellIndex`.
- Convert `cellIndex` back to 1-based `x` and `y`.
- Build a `Map<string, number[]>` or equivalent color-code index for fast hover/pin rendering.
- Render no-bead cells without MARD code text.
- Use the same readable text color logic as the DOM renderer or a tested equivalent.
- Avoid storing duplicated RGB per cell when the active palette can resolve color codes.

## Interaction Contract

### Hover And Pin

- Color usage hover must not cause React re-render of the full board.
- Color usage hover must not trigger CSS selector matching across thousands of DOM cells.
- Use `requestAnimationFrame` to coalesce rapid hover changes.
- Hover updates should redraw only the overlay canvas when possible.
- Pinning a color should reuse the same overlay mechanism and block transient hover changes until unpinned.
- Moving from one color usage row to another should switch directly from the previous code to the next code; it should not briefly clear to "all colors visible" between rows.

### Zoom And Pan

- Preserve existing zoom button semantics and Ctrl/Command wheel behavior.
- Preserve current view-mode panning semantics from the diff zone if present.
- Panning should operate on the canvas viewport scroll position or equivalent transform state.
- Cursor state should distinguish neutral view, pan-capable, and actively panning states.
- Zooming should keep the chart framed predictably and avoid making scrollbars the default first impression.

### Editing

- Paint, erase, pick, and replace continue to operate on `PatternEditState`, not on pixels as the source of truth.
- Pointer hit testing should convert canvas coordinates to `cellIndex`, then call existing edit helpers.
- One paint/erase stroke remains one undoable transaction.
- Pick mode should set active color from the effective pattern and return to paint mode after a successful pick.
- Replace remains a data operation, not a canvas pixel operation.
- Keyboard editing and active-cell movement must be preserved or intentionally redesigned with QA and accessibility coverage before DOM grid removal.

### Accessibility

Canvas does not provide one DOM element per cell. The migration must provide an accessibility fallback or equivalent:

- Keep a focusable board element with `role`, label, and keyboard instructions.
- Announce active cell coordinates and color through a live region or visible status.
- Preserve keyboard navigation for active cell movement where practical.
- Ensure toolbar buttons and color usage controls remain DOM-accessible.
- Do not rely on `title` per cell as the only accessible cell description.

## Execution Plan

Split implementation into small phases. Do not change more than 10 files in one implementation scope without stopping and splitting.

1. Add pure geometry and hit-testing tests before replacing the board.
2. Extract shared render geometry from DOM board assumptions so canvas and export rendering can share it.
3. Add a canvas renderer module for base chart drawing and unit-test deterministic geometry outputs.
4. Add an overlay renderer for hover, pin, active cell, and pointer preview.
5. Introduce a `PatternCanvasBoard` behind a local feature branch/small scope and wire it to existing `PatternGrid` props.
6. Preserve or migrate zoom, Ctrl/Command wheel zoom, view-mode panning, preview toggles, and export controls.
7. Preserve or migrate paint, pick, erase, replace, undo, redo, and reset interactions.
8. Remove the DOM-cell board only after feature parity is verified.
9. Update docs and source-guard tests after the canvas board is the primary implementation.
10. Run focused tests first, then full project verification.

Recommended first implementation scope:

- Add renderer geometry and hit-testing helpers.
- Add focused tests.
- Add no UI change yet.

Recommended second implementation scope:

- Add canvas base and overlay renderer.
- Add a temporary board component if needed.
- Preserve the old board until parity is proven.

Recommended third implementation scope:

- Wire canvas board as primary.
- Remove obsolete DOM focus CSS and DOM-cell-specific tests.
- Update docs and final verification.

## Performance Requirements

- Hovering across color usage rows should stay visually responsive on `78x78` and `100x100` patterns.
- Hover/pin should not require thousands of DOM mutations.
- Base canvas redraw should be bounded and should not run on every color usage hover.
- Overlay redraw should be coalesced with `requestAnimationFrame`.
- Device pixel ratio should be capped or handled carefully to avoid huge backing canvases.
- Text rendering should remain readable at default fit and zoomed views.
- Memory should not grow across repeated uploads, zooming, hovering, and pattern changes.

Suggested manual performance checks:

- Generate or load a `78x78` pattern with at least 20 used colors.
- Move the pointer quickly through the color usage list.
- Pin and unpin multiple colors.
- Zoom in to a scrollable scale and pan in view mode.
- Paint a long stroke, undo it, redo it, then reset.
- Repeat after switching theme and interface style.

## Testing Requirements

Add tests for:

- Geometry dimensions with and without axes.
- Pointer coordinate to cell index conversion.
- Out-of-grid hit testing returns null.
- Color-code to cell-index grouping.
- Overlay state selection for hover and pinned color.
- No-bead cell rendering contract.
- Zoom clamping and pan scroll math, preserving any existing pan tests.
- Source-guard tests that prevent reintroducing DOM-cell hover filtering as the primary highlight mechanism.

Where canvas pixel tests are too brittle, test the pure draw command model or geometry outputs. Use browser/manual verification for final rendering quality.

## Documentation Requirements

After implementation, update only docs that describe shipped behavior:

- `docs/architecture.md`
- `docs/pattern-processing.md` if renderer behavior affects processing/export explanations.
- `docs/design-rules.md` if chart rendering rules change.
- `docs/reference-feature-matrix.md`
- `FEATURES.md`
- `FEATURES_ZH.md`

Do not document canvas migration as shipped until the canvas board is actually primary.

## Verification

Run, at minimum:

```sh
pnpm design:generate
pnpm check
git diff --check
```

For implementation scopes that change runtime rendering, also run the Vite app and manually verify upload, generated chart rendering, color usage hover, pin/unpin, zoom, panning, editing tools, export, theme switching, and i18n labels.

## Done When

- Main generated pattern rendering no longer depends on one DOM element per bead cell.
- Color usage hover/pin uses overlay rendering or another low-churn mechanism, not CSS selector filtering across all cells.
- Editing tools still produce valid effective `Pattern` data.
- Zoom and panning preserve the current user-facing behavior.
- Export output remains correct.
- Accessibility and keyboard interaction have an explicit tested or manually verified path.
- Docs and tests agree with the new renderer architecture.

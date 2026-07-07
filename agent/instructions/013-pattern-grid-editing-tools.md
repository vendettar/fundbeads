# 013 Pattern Grid Editing Tools

## Status

Current instruction for manual editing tools on the generated pattern grid.

## Goal

Add a compact toolbar on the main generated pattern area so users can manually refine the bead chart after image generation with:

- Paint color
- Pick color
- Erase to no-bead
- Replace color

The edited chart must remain a valid Fundbeads `Pattern`: colored cells use MARD 221 colors, erased cells are represented as no-bead cells, usage counts are recomputed from effective cells, and processing stays browser-local.

This instruction is an implementation task, not a product-direction expansion. If implementation pressure suggests persistence UI, crop/framing work, advanced selection tools, or a backend, stop and return to Top for a new scoped instruction.

## Role Team

Use the Fundbeads role prompts before implementation. If subagents are available, use them for focused review; otherwise perform the same checks in the implementation report.

- `agent/role-prompt/top-role.md`: confirm this is an editing feature, not a new source-image crop mode or persistence feature.
- `agent/role-prompt/business-analyst-role.md`: keep the first implementation scoped to the core editing tools requested here.
- `agent/role-prompt/pattern-contract-role.md`: own edited pattern shape, effective cells, row-major order, coordinates, usage counts, and export/persistence compatibility.
- `agent/role-prompt/palette-data-role.md`: verify every manual edit uses only active `mard-221` palette codes.
- `agent/role-prompt/ui-designer-role.md`: own toolbar placement, icon controls, active tool state, color picker affordance, responsive behavior, and grid readability.
- `agent/role-prompt/performance-role.md`: review pointer editing on up to `100x100` cells, render churn, undo stack size, and drag behavior.
- `agent/role-prompt/security-role.md`: verify no upload, telemetry, remote image processing, remote palette source, or server dependency is introduced.
- `agent/role-prompt/qa-role.md`: define reducer/unit tests, interaction edge cases, accessibility checks, and non-E2E verification.
- `agent/role-prompt/documentation-steward-role.md`: update steady-state docs after implementation.
- `agent/role-prompt/reviewer-role.md`: final implementation review before completion.

## Read Order

- `agent/role-prompt/common-protocol.md`
- `agent/role-prompt/role-router.md`
- This instruction
- `docs/pattern-processing.md`
- `docs/design-rules.md`
- `docs/reference-feature-matrix.md`
- `docs/architecture.md`
- `README.md`, `FEATURES.md`, `FEATURES_ZH.md`
- `frontend/src/pattern.ts`
- `frontend/src/palette.ts`
- `frontend/src/palettes/mard.ts`
- `frontend/src/App.tsx`
- `frontend/src/i18n.tsx`
- `frontend/test/pattern.test.ts`
- `frontend/test/i18n-theme.test.ts`
- `local/pixel-ref` as a local UI interaction reference only

## Reference Notes

Use `local/pixel-ref` to understand interaction patterns only. The reference shows:

- A mode toolbar with view, brush, eraser, magic wand, and picker style controls.
- A replace-color control that opens a small palette/action surface.
- Quick color selection from the current pattern usage list.
- Undo and redo controls for manual edits.
- Pointer-based click or drag editing on the grid.

Do not copy unrelated product concepts from the reference:

- No account, save, upload, server API, remote sync, or export behavior.
- No blank canvas mode.
- No magic-wand or flood-fill tool in this instruction unless the user explicitly approves it later.
- No external names, URLs, or remote palette source references.

## Current State

- `frontend/src/App.tsx` renders the generated pattern through `PatternGrid`.
- `PatternGrid` currently supports fit-to-screen zoom and color focus highlighting.
- `Row` renders one DOM cell per bead with a MARD code and color.
- The left toolbar owns generation parameters: longest edge, matching mode, smoothing, and max color count.
- The detailed usage list can highlight a color on the grid, but it does not edit cells.
- `Pattern` data is generated from the source image and then held in React state as the final rendered pattern.
- Usage counts are derived from `Pattern.cells`.

## Product Requirement

Add manual editing after a pattern exists:

- The toolbar belongs to the main generated grid area, not the left generation-parameter toolbar.
- The toolbar should sit in the pattern grid header or as a safe sticky overlay inside the grid section. It must not hide the first row, axes, zoom controls, or cell labels at the default fit view.
- Users can choose a MARD 221 color and paint cells.
- Users can pick an existing cell color from the chart and make it the active paint color.
- Users can erase cells to no-bead empty cells.
- Users can replace one effective MARD color with another across the current pattern.
- The summary under the original-image rail and the detailed usage list must update from the edited/effective cells.
- Manual edits are session state only in this instruction. Persistence can store edited cells later through the existing local persistence infrastructure, but this instruction must not add new persistence UI.

## Execution Plan

Implement in small reviewable phases:

1. Add failing tests for pure editing state and effective pattern reconstruction.
2. Add a pure editing helper module with palette validation, override normalization, effective pattern derivation, transactions, undo, redo, and reset.
3. Wire `App.tsx` so generated pattern state becomes `basePattern`, rendered pattern state becomes the effective pattern, and all summaries consume the effective pattern.
4. Add the grid-area toolbar, active color selector, replace panel, and accessible localized labels.
5. Add pointer editing through grid-level event handling or another low-churn approach that is safe for `100x100` patterns.
6. Update tests, source assertions, and steady-state docs only after the UI behavior is actually implemented.
7. Run verification commands and add the instruction completion marker only after a reviewer pass.

If this work would require changing more than 10 files, stop and split the implementation into smaller instructions before editing.

## Tool Semantics

### View

Keep a neutral view mode so users can inspect, zoom, scroll, copy, and highlight colors without editing cells.

### Paint Color

- Active tool label: `涂色` / paint.
- Clicking a cell sets that cell's effective color to the active MARD color.
- Dragging across cells paints every newly entered cell once per pointer stroke.
- Painting with the same effective color is a no-op and should not create history noise.
- One pointer stroke should be one undoable transaction.

### Pick Color

- Active tool label: `取色` / pick.
- Clicking a cell sets `activeColorCode` to that cell's effective color code.
- After a successful pick, switch back to paint mode so the user can immediately continue editing.
- Picking does not change the pattern and must not create an undo entry.

### Erase To No-Bead

- Active tool label: `擦除` / erase.
- Clicking or dragging on a cell sets that cell's effective color to no-bead (`PatternCell.color = null`).
- No-bead cells render as empty cells and do not display a MARD code.
- `totalBeads` must decrease by the number of newly erased colored cells.
- Erasing a cell that is already effectively no-bead is a no-op and should not create history noise.
- One pointer stroke should be one undoable transaction.

### Replace Color

- Active tool label: `换色` / replace.
- Opens a compact popover or panel from the toolbar.
- The user chooses:
  - source color code
  - target color code
- Source and target must both be valid `mard-221` codes.
- The source color should default to the currently active color or a selected usage-list color when available.
- Apply replaces all effective cells with the source code to the target code as one undoable transaction.
- If source and target are equal, missing, or the source color is not present in the effective pattern, the action is disabled or returns a visible no-op message.

### Undo, Redo, Reset

Manual editing should include small icon controls for:

- Undo last edit transaction.
- Redo last undone edit transaction.
- Reset all manual edits for the current generated pattern.

Undo/redo/reset may live in the same grid toolbar. Reset should be disabled when there are no manual edits. If reset is implemented as a destructive action, require a clear confirmation or an easy undo path.

## Editing Data Contract

Do not mutate base pattern cells as the only source of truth.

Recommended model:

```ts
export type PatternEditTool = "view" | "paint" | "pick" | "erase" | "replace";

export type PatternEditOverrideMap = Record<number, string | null>;

export type PatternEditState = {
  basePattern: Pattern;
  activeColorCode: string;
  tool: PatternEditTool;
  overrides: PatternEditOverrideMap;
  undoStack: PatternEditTransaction[];
  redoStack: PatternEditTransaction[];
};
```

Rules:

- `basePattern` is the generated pattern before manual edits.
- Override keys are zero-based row-major cell indexes.
- Override values are MARD color codes or `null` for no-bead, not copied RGB objects.
- Override indexes must be integers within `0..basePattern.cells.length - 1`.
- The effective pattern is reconstructed by applying overrides to `basePattern.cells`.
- Effective cells must keep 1-based `x` and `y` coordinates.
- Effective cells must stay row-major.
- Effective usage must be recomputed with `summarizeCells` or an equivalent tested helper.
- `Pattern.totalBeads` must equal the count of effective cells with a non-null color.
- For complete generated charts before erasing, `Pattern.totalBeads` equals `width * height`.
- After erasing cells to no-bead, `Pattern.totalBeads` can be less than `width * height`.
- Unknown color codes must be rejected before they can enter edit state.
- If an override sets a cell to the same color as the base cell, remove that override.
- Manual edit state should store color codes, `null` no-bead overrides, and transaction diffs, not copied `BeadColor` objects for every edited cell.
- The helper must resolve color codes back through the active palette when constructing effective cells.
- Invalid base patterns, unknown override codes, and out-of-range override indexes should fail loudly in tests rather than silently producing corrupt patterns.

Transaction rules:

- A transaction is the smallest undoable user action: one paint stroke, one erase stroke, one replace action, or one reset action.
- Transactions should capture only changed cell indexes and before/after override state.
- No-op operations must not create undo entries.
- Undo applies the transaction's previous override state and pushes the transaction to redo.
- Redo reapplies the transaction's next override state and pushes it back to undo.
- Reset should be undoable unless the UI adds an explicit confirmation flow.
- A new edit after undo must clear redo.
- The undo stack must be bounded and deterministic; keep the newest transactions when trimming.

Replace rules:

- Replace operates on the current effective pattern, not only on existing overrides.
- Cells whose effective color is not the source code are unchanged.
- If a base cell is the source color and has no override, replacing it creates an override to the target color.
- If an overridden cell is the source color, replacing it changes that override to the target color.
- If the target color equals a cell's base color, the resulting override for that cell must be removed.
- Replace must preserve row-major order and recompute usage from the resulting effective cells.

Suggested helper module:

- Add `frontend/src/pattern-edit.ts`.
- Keep edit operations pure and covered by focused unit tests.
- Avoid pushing UI-only state into `frontend/src/pattern.ts` unless the contract genuinely belongs there.

Recommended helper responsibilities:

```ts
createPatternEditState(basePattern: Pattern, palette: BeadColor[]): PatternEditState
getEffectivePattern(editState: PatternEditState, palette: BeadColor[]): Pattern
paintPatternCell(editState: PatternEditState, cellIndex: number, colorCode: string): PatternEditState
erasePatternCell(editState: PatternEditState, cellIndex: number): PatternEditState
replacePatternColor(editState: PatternEditState, fromCode: string, toCode: string): PatternEditState
undoPatternEdit(editState: PatternEditState): PatternEditState
redoPatternEdit(editState: PatternEditState): PatternEditState
resetPatternEdits(editState: PatternEditState): PatternEditState
```

The final API can differ, but it must preserve the same responsibilities and tests.

## State Integration Requirements

- `App.tsx` should keep the generated pattern available as the edit state's `basePattern`.
- The rendered `PatternGrid`, compact summary, detailed usage list, focused-color highlighting, and replacement source options must consume the effective pattern.
- The original image preview and source image metadata must continue to represent the uploaded image, not edited pattern cells.
- The existing pattern generation options remain the only source-image processing controls in this instruction.
- When `imageFileToPattern` or equivalent generation completes with a new pattern, initialize a fresh edit state for that base pattern and discard the previous undo/redo stacks.
- If generation fails, do not keep outdated edits attached to a failed or absent pattern.
- If the user changes the active language, theme, or interface style, edit state should remain unchanged.
- If the user changes active paint color or tool mode, pattern data should remain unchanged unless a paint, erase, replace, reset, undo, or redo action is applied.

## UI Requirements

- Use lucide icons that already exist in the project where possible, for example `Paintbrush`, `Pipette`, `Eraser`, `Replace`, `Undo2`, `Redo2`, and `RotateCcw`.
- Use text or icon-plus-text for clarity on desktop; compact icon buttons with accessible labels are acceptable on narrow screens.
- Use an active state for the selected tool.
- Show the active color code and swatch near the paint/pick controls.
- Provide a MARD color selector for active paint color. It can be a compact searchable popover, grouped palette list, or reuse a focused internal palette picker component.
- Do not place all 221 colors directly into the first viewport as a permanent panel.
- Keep controls visually consistent with the current grid header, zoom controls, border, focus ring, theme tokens, and Pixel UI mode.
- Make toolbar controls keyboard reachable.
- Add localized labels for all supported locales.
- MARD codes remain untranslated.
- Color selector search, if added, may search MARD codes and display labels but must commit only the stable MARD code.
- The active color selector should make unavailable/invalid colors impossible to choose from normal UI paths.
- Replace controls should clearly distinguish source and target colors with swatches and codes.
- Disabled undo, redo, reset, and replace apply states must be visible and keyboard-safe.
- Pointer editing should not interfere with grid zoom, scroll, or color highlighting.
- Ctrl/Command + wheel zoom behavior must continue to work while the pointer is over the grid.

## Interaction and Performance Requirements

- Prefer event delegation on the grid container, or otherwise avoid adding expensive per-cell closures for `100x100` charts.
- Add stable cell data attributes such as `data-cell-index`, `data-x`, and `data-y` if needed for pointer handling.
- Use Pointer Events for click and drag editing.
- Only the primary pointer action should paint or erase; secondary click/context menu behavior should not accidentally edit cells.
- Release pointer capture and clear stroke-local state on pointer up, cancel, leave, lost capture, or component unmount.
- Track visited cell indexes during a drag so the same cell is not edited repeatedly in one stroke.
- Accumulate stroke changes locally and commit one transaction at the end of the stroke, or otherwise guarantee one undo entry per stroke.
- Do not update React state for every pointer move when the effective operation is a no-op.
- Keep undo stack bounded, for example 50 transactions.
- Clear redo stack when a new edit is applied after undo.
- New upload, reprocessing, longest-edge change, matching-mode change, smoothing change, or max-color change should create a new `basePattern` and clear edit history for that new generated result.
- If a future task wants to preserve edits across reprocessing, that must be a separate instruction because cell identity and colors can change.

## Out of Scope

Do not implement these in this instruction:

- Source-image crop, zoom, drag-to-frame, or fixed square viewport mode.
- Magic wand, flood fill, lasso, rectangular selection, multi-select, layers, or masks.
- Blank canvas creation.
- Server save, upload, account sync, or cloud storage.
- New palette data, remote palette loading, or MARD edition switching.
- Printable export changes.
- E2E tests unless the user explicitly asks for them later.

## Expected File Scope

The implementation should stay close to these surfaces:

- `frontend/src/pattern-edit.ts` for pure edit helpers.
- `frontend/src/App.tsx` for toolbar, effective pattern wiring, and pointer interactions.
- `frontend/src/i18n.tsx` for localized labels.
- `frontend/test/pattern-edit.test.ts` for pure helper coverage.
- `frontend/test/i18n-theme.test.ts` or an equivalent focused source suite for labels, scope, and negative assertions.
- Steady-state docs listed in this instruction after the feature is implemented.

Avoid broad refactors. If additional shared components or test files become necessary, explain why in the implementation report and keep the changed-file count under the protocol limit.

## Required Tests

Use TDD for the pure editing helpers. Add failing tests before implementation and verify they fail for the expected reason.

Required `frontend/test/pattern-edit.test.ts` coverage:

- Creating edit state from a generated pattern preserves base dimensions and chooses a valid active color.
- Creating edit state rejects unknown active color codes and invalid override maps if such inputs are exposed by helpers.
- Painting a cell creates one override and updates the effective pattern cell color.
- Painting a cell to its base color removes the override.
- Paint and erase reject out-of-range cell indexes.
- Picking a color updates active color in UI/controller tests without changing pattern data.
- Erasing a painted cell sets it to no-bead.
- Erasing an unedited colored cell sets it to no-bead.
- Erasing an already effective no-bead cell is a no-op.
- Replace color changes every effective source-code cell to the target code.
- Replace removes overrides when the target color equals that cell's base color.
- Replace color is a no-op or rejected when source and target are equal.
- Replace color is rejected for unknown MARD codes.
- Effective usage counts and `totalBeads` recompute after paint, erase, and replace, excluding no-bead cells.
- Effective cells remain row-major with 1-based coordinates.
- Undo and redo work for paint strokes, erase strokes, replace, and reset.
- Undo stack is bounded and redo clears after a new edit.
- Reset clears overrides and is undoable, or the UI has a tested confirmation path.
- Reinitializing from a new generated pattern clears overrides, undo, and redo.

Required UI/source coverage in `frontend/test/i18n-theme.test.ts` or an equivalent focused suite:

- Toolbar labels exist across `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, and `es`.
- MARD codes are not localized.
- Toolbar is attached to the generated pattern area, not the left generation toolbar.
- Active tool state and active color are source-defined, not inferred from DOM text.
- No network, upload service, telemetry, remote image processing, CDN, or remote palette source is introduced.

Manual verification for the implementer:

- Upload a landscape image and generate a pattern.
- Paint a few cells, pick a color from the grid, erase painted cells, and replace a color.
- Drag paint and drag erase across several cells, then undo each stroke with one action.
- Confirm the compact summary and detailed usage list update immediately.
- Confirm zoom, scroll, and color focus highlighting still work.
- Confirm erased cells become no-bead empty cells and total bead count decreases accordingly.
- Change matching mode, smoothing, max color count, or longest edge and confirm the regenerated pattern starts with no outdated manual edits.

## Documentation Updates

After implementation, update steady-state docs:

- `docs/pattern-processing.md`: describe effective pattern editing, overrides, erase semantics, and count recomputation.
- `docs/design-rules.md`: describe main grid editing toolbar placement and controls.
- `docs/reference-feature-matrix.md`: mark manual grid editing as supported and list deferred advanced editing tools.
- `docs/architecture.md`: update the data flow/source-of-truth map if a new edit helper module is added.
- `README.md`, `FEATURES.md`, and `FEATURES_ZH.md`: mention post-generation manual editing only if the feature is visible to users.

Do not describe the feature as planned after it ships.
Do not update current-feature docs before the visible feature is implemented and verified.
If the final implementation defers any control listed here, document the deferral as planned/backlog instead of implying shipped support.

## Verification Commands

Run non-E2E verification unless the user explicitly asks for browser E2E checks.

```sh
pnpm --dir frontend test:run test/pattern-edit.test.ts test/pattern.test.ts test/i18n-theme.test.ts
pnpm test:frontend
pnpm check
git diff --check
```

Also run focused negative searches:

```sh
rg -n "fetch\\s*\\(|XMLHttpRequest|sendBeacon|https?://|telemetry|cdn" frontend/src frontend/test
rg -n "EMPTY_CELL|blankCanvas|floodFill|magic|wand" frontend/src frontend/test
```

The second search is expected to return nothing for this instruction unless a future approved task adds those concepts.

## Done When

- The generated pattern grid has a main-area editing toolbar.
- Users can paint cells with a valid MARD 221 color.
- Users can pick a cell color into the active paint color.
- Users can erase cells to no-bead empty cells.
- Users can replace one effective color with another across the pattern.
- Undo, redo, and reset protect users from accidental edits.
- Effective `Pattern.cells`, `usage`, and `totalBeads` reflect manual edits.
- The original image preview remains unchanged.
- New generation/reprocessing clears edit state for the new base pattern.
- No backend, upload service, telemetry, remote palette source, or E2E dependency is added.
- Focused tests and docs updates cover the edited-pattern contract.
- Verification output lists commands run, pass/fail status, manual checks performed, negative search results, and residual risks.

## Implementation Surface

- Added pure pattern editing helpers in `frontend/src/pattern-edit.ts` for base/effective pattern state, paint, erase to no-bead, replace, undo, redo, reset, override validation, and bounded history.
- Wired the generated grid to render effective pattern state and added grid-area edit controls for view, paint, pick, erase, replace, undo, redo, reset, active color, and replace source/target swatches.
- Added delegated pointer editing with stroke-level transactions, skipped-cell interpolation, primary-pointer guards, pointer capture release, leave/cancel/lost-capture cleanup, and unmount cleanup.
- Updated localized labels, focused unit/source tests, and steady-state docs for session-only manual editing and effective-cell usage counts.

Verification:

- `pnpm --dir frontend test:run test/pattern-edit.test.ts` passed: 14 tests.
- `pnpm --dir frontend test:run test/pattern-edit.test.ts test/pattern.test.ts test/i18n-theme.test.ts` passed: 125 tests.
- `pnpm test:frontend` passed: 148 tests.
- `pnpm check` passed.
- `git diff --check` passed.
- `rg -n "fetch\\s*\\(|XMLHttpRequest|sendBeacon|https?://|telemetry|cdn" frontend/src frontend/test` only matched the test guard in `frontend/test/i18n-theme.test.ts`.
- `rg -n "EMPTY_CELL|blankCanvas|floodFill|magic|wand" frontend/src frontend/test` returned no matches.

Manual verification boundary:

- Browser/E2E verification is outside the current requested verification scope.

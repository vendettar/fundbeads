# 004 Bead Counter and Summary Statistics

## Goal

Show the exact bead quantities needed for the generated pattern.

## Scope

- Pattern summary generation in `frontend/src/pattern.ts`.
- Summary display in the app UI.
- Tests for count aggregation and total validation.

## Required Changes

- Display overall stats near the generated pattern, including resolution, number of used colors, and total bead count.
- Below the grid, display a summary of every used color.
- Each summary item must show:
  - MARD code.
  - Color block.
  - Human-readable label.
  - Exact bead count.
- Sort summary entries by count descending, then by MARD code for stable ties.
- Ensure the total of all color counts equals the total bead count.

## Forbidden

- Do not parse rendered UI text to compute counts.
- Do not keep a second mutable count source separate from pattern cells.
- Do not group by label when code is available.
- Do not round, estimate, or collapse low-count colors in the current summary.

## Implementation Notes

- Derive counts from the generated pattern cells, not from a separate processing pass.
- Keep summary logic deterministic and unit-testable.
- Preserve compact layout so summaries remain scannable for many colors.
- `Pattern.totalBeads` should equal `Pattern.cells.length`; for complete generated patterns it should equal `size * size`.

## Verification

- Generate a pattern and confirm total beads equals `52 * 52`, `64 * 64`, or `78 * 78`.
- Confirm the sum of summary counts equals the total bead count.
- Confirm repeated colors are combined into a single summary row.
- Confirm color swatches match the grid cell backgrounds for the same code.
- Run `pnpm check`.

## Done When

- A user can buy or prepare beads using the summary without manually counting the grid.
- Summary rows and grid cells agree on code, color, label, and count ownership.

## Decision Log

Required if summary grouping, sorting, or count ownership changes.

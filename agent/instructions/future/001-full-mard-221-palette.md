# 001 Full MARD 221 Palette

## Status

Backlog. Not approved for implementation until selected.

## Goal

Replace the current mock MARD palette subset with a verified full 221-color MARD palette without breaking pattern generation, summary counts, or UI readability.

## Scope

- Palette source validation and normalization.
- `frontend/src/palette.ts` or a structured generated/static palette module.
- Tests that depend on nearest-color matching and palette integrity.
- Docs that explain palette source and mock/full status.

## Required Decisions

- Source of the 221-color palette and review date.
- Whether palette data remains hand-maintained TypeScript or is generated from a source artifact.
- Duplicate-code and duplicate-RGB handling.
- Palette ordering and tie-break behavior for equal RGB distances.
- Whether the UI needs palette filtering or color-family grouping in the same release.

## Acceptance Criteria

- Every palette entry has `code`, `label`, and integer RGB values in `0..255`.
- No duplicate `code` exists unless variants are explicitly modeled.
- Nearest-color matching remains deterministic.
- Color usage counts still derive only from pattern cells.
- Docs no longer describe the active palette as mock after verification lands.

## Required Tests

- Palette integrity tests for code uniqueness, RGB range, and required fields.
- Nearest-color regression tests for representative colors.
- Summary aggregation tests after the palette change.
- Manual grid readability check for dark, light, saturated, and low-contrast colors.

## Verification Commands

```sh
pnpm design:generate
pnpm check
```

## Decision Log

Required.

# 001 MARD 221 Palette

## Status

Implemented by direct user-approved task. Retained as historical planning context; do not route as future work.

## Goal

Use `mard-221` as the active built-in static MARD palette without breaking pattern generation, summary counts, or UI readability.

## Scope

- Palette data normalization.
- `frontend/src/palette.ts` and `frontend/src/palettes/mard.ts`.
- Tests that depend on nearest-color matching and palette integrity.
- Docs that explain the active `mard-221` contract.

## Required Decisions

- Whether future MARD editions remain hand-maintained TypeScript or are generated from a source artifact.
- Duplicate-code and duplicate-RGB handling.
- Palette ordering and tie-break behavior for equal RGB distances.
- Whether the UI needs palette filtering or color-family grouping in the same release.

## Acceptance Criteria

- Every palette entry has `code`, `label`, and integer RGB values in `0..255`.
- No duplicate `code` exists unless variants are explicitly modeled.
- Nearest-color matching remains deterministic.
- Color usage counts still derive only from pattern cells.
- Docs no longer describe the active palette as mock.

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

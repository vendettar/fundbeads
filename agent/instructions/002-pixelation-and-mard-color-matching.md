# 002 Pixelation and MARD Color Matching

## Goal

Convert the uploaded image into a bead pattern by sampling it into the selected grid size and matching each sampled color to a MARD bead color.

## Scope

- `frontend/src/palette.ts`
- `frontend/src/pattern.ts`
- Pattern utility tests.

## Required Changes

- Create a hardcoded MARD palette array with a mock subset of about 20-30 distinct colors.
- Each palette entry must include a code such as `A1`, `C2`, `H7`, or `H14`, a label, and RGB values.
- Sample the image into a square grid matching the selected resolution.
- Match each sampled RGB value to the nearest palette color using Euclidean RGB distance.
- Treat transparent pixels predictably by compositing them against a white background.
- Return deterministic pattern data that can be rendered and tested independently from React.

## Forbidden

- Do not claim the mock palette is the full MARD 221-color palette.
- Do not fetch palette data or process images remotely.
- Do not derive palette identity from labels.
- Do not couple pure pattern utilities to React components.

## Implementation Notes

- Keep palette data separate from image-processing functions.
- Keep pure utilities for distance calculation, nearest-color matching, luminance, and color usage summaries.
- The full MARD 221-color dataset is out of scope for this iteration; the mock subset must be easy to replace later.
- Current nearest-color tie behavior follows palette array order unless a later contract changes it.
- Transparent pixels are composited against white before matching so transparent PNGs produce deterministic bead colors.

## Verification

- Unit-test nearest-color matching with representative colors.
- Unit-test color usage summaries.
- Confirm generated pattern cell count equals `gridSize * gridSize`.
- Confirm transparent PNG pixels do not produce undefined or inconsistent colors.
- Run `pnpm check`.

## Done When

- The app can produce a complete grid of MARD-coded bead cells from an uploaded image.
- Core pattern logic is covered by focused tests.
- Pattern data uses stable `GridSize`, `PatternCell`, `BeadColor`, `ColorUsage`, and `Pattern` contracts.

## Decision Log

Required if the palette source, matching algorithm, transparent pixel policy, or supported grid sizes change.

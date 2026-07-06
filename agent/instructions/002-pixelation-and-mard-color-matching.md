# 002 Pixelation and MARD Color Matching

## Goal

Convert the uploaded image into a bead pattern by sampling it into aspect-ratio-preserving output dimensions and matching each sampled color to a MARD bead color.

## Scope

- `frontend/src/palette.ts`
- `frontend/src/pattern.ts`
- Pattern utility tests.

## Required Changes

- Use the built-in static MARD 221 palette dataset.
- Each palette entry must include a code such as `A1`, `C2`, `H7`, or `H14`, a label, and RGB values.
- Sample the image into `width` and `height` derived from the selected longest edge and source aspect ratio.
- Match each sampled RGB value to the nearest palette color using the configured color-distance mode.
- Treat transparent pixels predictably by compositing them against a white background.
- Return deterministic pattern data that can be rendered and tested independently from React.

## Forbidden

- Do not replace the verified `mard-221` dataset with an unverified subset.
- Do not fetch palette data or process images remotely.
- Do not derive palette identity from labels.
- Do not couple pure pattern utilities to React components.

## Implementation Notes

- Keep palette data separate from image-processing functions.
- Keep pure utilities for distance calculation, nearest-color matching, luminance, and color usage summaries.
- Preserve the static `mard-221` slug, version, code ordering, and validation tests unless a separate palette-data instruction changes them.
- Current nearest-color tie behavior follows palette array order unless a later contract changes it.
- Transparent pixels are composited against white before matching so transparent PNGs produce deterministic bead colors.

## Verification

- Unit-test nearest-color matching with representative colors.
- Unit-test color usage summaries.
- Confirm complete generated pattern cell count equals `width * height`.
- Confirm transparent PNG pixels do not produce undefined or inconsistent colors.
- Run `pnpm check`.

## Done When

- The app can produce a complete grid of MARD-coded bead cells from an uploaded image.
- Core pattern logic is covered by focused tests.
- Pattern data uses stable `PatternDimensions`, `PatternCell`, `BeadColor`, `ColorUsage`, and `Pattern` contracts.

## Decision Log

Required if the palette source, matching algorithm, transparent pixel policy, or output-dimension contract changes.

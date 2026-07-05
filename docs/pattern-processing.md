# Pattern Processing

This document owns the Fundbeads pattern-processing contract.

## Current Flow

1. The user uploads a JPG or PNG through the browser file input.
2. The file is decoded with `createImageBitmap`.
3. A square canvas is created at the selected grid size: `52`, `64`, or `78`.
4. The decoded image is drawn into that square canvas.
5. `getImageData` reads one RGBA sample per output bead cell.
6. Alpha is composited against white:
   - `sample = source * alpha + 255 * (1 - alpha)`
7. The resulting RGB sample is matched to the nearest mock MARD color.
8. The app returns `Pattern` data and renders the grid plus color usage summary.

## Palette Contract

The active palette is a hardcoded mock MARD subset in `frontend/src/palette.ts`.

Each color must include:

| Field | Type | Contract |
| --- | --- | --- |
| `code` | `string` | Stable bead color identity, such as `C2` or `H14`. |
| `label` | `string` | Human-readable display name. |
| `r` | `number` | Integer red channel, `0..255`. |
| `g` | `number` | Integer green channel, `0..255`. |
| `b` | `number` | Integer blue channel, `0..255`. |

The current palette is not the full MARD 221-color dataset. Full palette replacement is tracked in [agent/instructions/future/001-full-mard-221-palette.md](../agent/instructions/future/001-full-mard-221-palette.md).

## Matching Algorithm

Fundbeads uses squared RGB Euclidean distance:

```ts
(a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
```

The square root is intentionally omitted because it does not change nearest-color ordering.

When two colors have the same distance, current behavior keeps the first matching palette entry by array order.

## Pattern Types

Current TypeScript contracts live in `frontend/src/pattern.ts`.

- `GridSize`: `52 | 64 | 78`
- `PatternCell`: 1-based `x`, 1-based `y`, and matched `BeadColor`
- `ColorUsage`: `BeadColor` plus exact `count`
- `Pattern`: selected `size`, row-major `cells`, sorted `usage`, and `totalBeads`

## Counting

Every output cell maps to exactly one bead.

- `totalBeads = cells.length`
- For complete generated patterns, `totalBeads = size * size`
- Summary rows are sorted by count descending, then by MARD code for stable ties.
- Summary counts are derived from cells, not from rendered UI text.

## Known Limitations

- The source image is currently stretched into a square canvas. There is no crop, fit, or aspect-ratio positioning control yet.
- The palette is a mock subset.
- There is no printable export yet.
- Large source image decoding depends on browser capabilities. The output grid itself is bounded to at most `78x78`.

## Verification

Use focused unit tests for deterministic utilities and browser/manual checks for file upload and visual grid output.

```sh
pnpm check
```

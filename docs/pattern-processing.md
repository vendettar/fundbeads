# Pattern Processing

This document owns the Fundbeads pattern-processing contract.

## Current Flow

1. The user uploads a JPG or PNG through the browser file input.
2. The file is decoded with `createImageBitmap`.
3. The selected longest edge is normalized to an integer from `40` to `100`.
4. Pattern dimensions are derived from the decoded image aspect ratio. For example, a `16:9` source with longest edge `80` generates `80x45`.
5. A canvas is created at the derived pattern dimensions.
6. The full decoded image is drawn into that canvas without cropping. Because the target dimensions match the source ratio, the image is not squeezed non-proportionally.
7. `getImageData` reads one RGBA sample per output bead cell.
8. Alpha is composited against white:
   - `sample = source * alpha + 255 * (1 - alpha)`
9. The resulting RGB sample is matched to the nearest MARD 221 color.
10. The app returns `Pattern` data and renders the grid plus color usage summary.

## Palette Contract

The active palette is the built-in static MARD 221 dataset exposed through `frontend/src/palette.ts`.

Each color must include:

| Field | Type | Contract |
| --- | --- | --- |
| `code` | `string` | Stable bead color identity, such as `C2` or `H14`. |
| `label` | `string` | Human-readable display name. |
| `r` | `number` | Integer red channel, `0..255`. |
| `g` | `number` | Integer green channel, `0..255`. |
| `b` | `number` | Integer blue channel, `0..255`. |

`frontend/src/palettes/mard.ts` owns the extensible static palette definition. `mard221Palette.slug` is `mard-221`; future MARD editions should use the same schema with a distinct slug such as `mard-288`.

## Matching Algorithm

Fundbeads uses squared RGB Euclidean distance:

```ts
(a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
```

The square root is intentionally omitted because it does not change nearest-color ordering.

When two colors have the same distance, current behavior keeps the first matching palette entry by array order.

## Pattern Types

Current TypeScript contracts live in `frontend/src/pattern.ts`.

- `PatternDimensions`: integer `width` and `height`, each clamped to `40..100`
- `patternLongestEdgePresets`: `52`, `64`, and `78`
- `dimensionsForAspectRatio`: derives `PatternDimensions` from source image size and selected longest edge
- `PatternCell`: 1-based `x`, 1-based `y`, and matched `BeadColor`
- `ColorUsage`: `BeadColor` plus exact `count`
- `Pattern`: selected `width`, selected `height`, row-major `cells`, sorted `usage`, and `totalBeads`

## Counting

Every output cell maps to exactly one bead.

- `totalBeads = cells.length`
- For complete generated patterns, `totalBeads = width * height`
- Summary rows are sorted by count descending, then by MARD code for stable ties.
- Summary counts are derived from cells, not from rendered UI text.

## Known Limitations

- Fixed-size crop, zoom, or drag-to-frame controls are not implemented yet.
- Palette label overrides are optional; stable fallback labels use `MARD {code}`.
- There is no printable export yet.
- Large source image decoding depends on browser capabilities. The output grid itself is bounded to at most `100x100`.

## Verification

Use focused unit tests for deterministic utilities and browser/manual checks for file upload and visual grid output.

```sh
pnpm check
```

# Pattern Processing

This document owns the Fundbeads pattern-processing contract.

## Current Flow

1. The user uploads a JPG, PNG, or WebP through the browser file input.
2. The file is decoded with `createImageBitmap`.
3. The selected longest edge is normalized to an integer from `40` to `100`.
4. Pattern dimensions are derived from the decoded image aspect ratio. For example, a `16:9` source with longest edge `64` generates `64x36`; the derived shorter side may be below `40` but is never below `1`.
5. A canvas is created at the derived pattern dimensions.
6. The full decoded image is drawn into that canvas without cropping. Because the target dimensions match the source ratio, the image is not squeezed non-proportionally.
7. `getImageData` reads one RGBA sample per output bead cell.
8. Alpha is composited against white:
   - `sample = source * alpha + 255 * (1 - alpha)`
9. The resulting RGB sample is matched to the nearest MARD 221 color using the selected color-distance algorithm and optional dither mode.
10. Max-color limiting keeps the most-used colors and remaps other cells to that retained palette.
11. The app stores the generated `Pattern` as the base pattern for the current session.
12. Optional manual grid edits are applied as MARD-code overrides to produce an effective `Pattern`.
13. React renders the effective grid plus color usage summary.

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

## Matching Algorithms

Fundbeads separates nearest-color distance from dithering. The default distance mode is `oklab`, exposed in the UI as Perceptual. The default dither mode is `off`.

### Fast RGB

`rgb-fast` uses squared RGB Euclidean distance:

```ts
(a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
```

The square root is intentionally omitted because it does not change nearest-color ordering.

### Weighted RGB

`weighted-rgb` uses the same RGB channels with simple perceptual weights:

```ts
0.3 * dr ** 2 + 0.59 * dg ** 2 + 0.11 * db ** 2
```

This remains fast but gives green-channel differences more influence than blue-channel differences.

### Perceptual Oklab

`oklab` converts both the sample color and cached MARD 221 palette colors into Oklab, then uses squared distance in Oklab space.

This is the recommended default because it better matches perceived color difference than raw RGB distance while staying practical for `100x100` patterns.

### Lab Delta-E

`lab-delta-e` converts samples and cached MARD 221 palette colors to CIE Lab, then uses Delta-E 76 distance. This is the first Lab implementation in the project. Delta-E 2000 is not implemented.

## Dither Modes

Dithering is selected independently from the distance algorithm. This means RGB Fast, Weighted RGB, Oklab, and Lab Delta-E can each run with no dither, Floyd-Steinberg, or ordered dither.

### Off

`off` maps each sampled pixel independently to the nearest MARD 221 color.

### Floyd-Steinberg

`floyd-steinberg` applies row-major Floyd-Steinberg error diffusion before matching neighboring cells. It can preserve gradients and photo detail better, but it may produce more speckled charts and can increase practical bead-picking complexity.

### Ordered

`ordered` applies a deterministic 4x4 Bayer-style threshold matrix before matching. It is less adaptive than Floyd-Steinberg but produces stable, local texture without propagating error across the whole image.

### Shared Rules

- When two colors have the same distance, current behavior keeps the first matching palette entry by array order.
- Transparent PNG/WebP pixels are always composited over white before matching, regardless of mode.
- MARD palette Oklab and CIE Lab values are cached so the app does not convert all 221 palette colors for every sampled pixel.
- The smoothing control applies a small canvas blur before pixel reads. Level `0` means no extra blur beyond normal canvas downscaling; levels `1..3` add increasing blur.
- The max-color control is a bounded draggable slider with stepper controls: minimum `2`, maximum `64`, default `24`. Limiting is a post-process: Fundbeads first matches all cells, keeps the most-used MARD codes, then remaps other cells to the retained color set.

## Pattern Types

Current TypeScript contracts live in `frontend/src/pattern.ts`.

- `PatternDimensions`: integer `width` and `height`; each side is bounded to `1..100`, and the longest edge is bounded to `40..100`
- `patternLongestEdgePresets`: `52`, `64`, and `78`
- `dimensionsForAspectRatio`: derives `PatternDimensions` from source image size and selected longest edge
- `PatternCell`: 1-based `x`, 1-based `y`, and matched `BeadColor`
- `ColorUsage`: `BeadColor` plus exact `count`
- `Pattern`: selected `width`, selected `height`, row-major `cells`, sorted `usage`, and `totalBeads`

Manual edit contracts live in `frontend/src/pattern-edit.ts`.

- `PatternEditTool`: view, paint, pick, erase, or replace mode
- `PatternEditOverrideMap`: zero-based row-major cell index mapped to a MARD color code
- `PatternEditState`: generated `basePattern`, active color, active tool, overrides, and bounded undo/redo stacks
- Effective patterns are reconstructed from `basePattern.cells` plus overrides.

## Manual Editing

Manual editing happens after image generation and stays in browser session state.

- The generated `basePattern` is not mutated as the only source of truth.
- Paint sets one or more cells to a valid active `mard-221` color code.
- Pick copies a cell's effective color code into the active paint color without changing the pattern.
- Erase sets one or more cells to the MARD `H1` white color (`#ffffff`).
- Replace changes all effective cells of one MARD code to another valid MARD code.
- Undo, redo, and reset operate on edit transactions. A paint or erase drag stroke is one transaction.
- A new upload or reprocessing run creates a new base pattern and clears prior manual edit history.

Erase never creates empty, transparent, blank, or no-bead cells. Erased cells are still regular MARD 221 cells that use code `H1`.

## Counting

Every output cell maps to exactly one bead. When manual edits exist, counting uses the effective cells.

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

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
12. Optional manual grid edits are applied as MARD-code or no-bead overrides to produce an effective `Pattern`.
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
- `PatternCell`: 1-based `x`, 1-based `y`, and `BeadColor | null`; `null` means an edited no-bead cell
- `ColorUsage`: `BeadColor` plus exact `count`
- `Pattern`: selected `width`, selected `height`, row-major `cells`, sorted `usage`, and `totalBeads`

Manual edit contracts live in `frontend/src/pattern-edit.ts`.

- `PatternEditTool`: view, paint, pick, erase, or replace mode
- `PatternEditOverrideMap`: zero-based row-major cell index mapped to a MARD color code, or `null` for no-bead
- `PatternEditState`: generated `basePattern`, active color, active tool, overrides, and bounded undo/redo stacks
- Effective patterns are reconstructed from `basePattern.cells` plus overrides.

## Manual Editing

Manual editing happens after image generation and stays in browser session state.

- The generated `basePattern` is not mutated as the only source of truth.
- Paint sets one or more cells to a valid active `mard-221` color code.
- Pick copies a cell's effective color code into the active paint color without changing the pattern; picking a no-bead cell is a no-op.
- Erase sets one or more cells to no-bead (`PatternCell.color = null`).
- Replace changes all effective cells of one MARD code to another valid MARD code.
- Replace is a transient panel action: opening the replace picker temporarily shows Replace as the active toolbar button, but closing the picker restores the tool that was active before Replace was opened.
- Undo, redo, and reset operate on edit transactions. A paint or erase drag stroke is one transaction.
- During a paint or erase drag stroke, the grid may render an immediate stroke preview before pointer release. The preview affects only the grid surface; usage counts, summaries, exports, persistence, and undo/redo history are updated only when the pointer is released and the stroke commits as one transaction.
- A new upload or reprocessing run creates a new base pattern and clears prior manual edit history.
- Clicking a color in Color Details pins that MARD code as a grid filter. The pin remains active across paint, erase, pick, replace, undo, redo, and reset operations until the user clicks the same Color Details row again, or until a new upload/reprocessing run replaces the base pattern.
- While a color pin is active, hidden cells are not editable. Paint, erase, pick, drag strokes, and keyboard edits only affect cells whose current effective color matches the pinned MARD code. Empty no-bead cells and cells with other MARD codes are visually hidden and treated as no-op edit targets.
- While a color pin is active, Replace source choices are limited to the pinned MARD code. This keeps Replace from changing hidden non-pinned colors.
- If a visible pinned-color cell is erased while the pin is active, the cell receives a neutral edited-away marker so the user can see where the removal happened even though the no-bead result is hidden by the pin filter.
- If a visible pinned-color cell is painted to another MARD code while the pin is active, the cell is filled with a marker showing the target MARD code on the target MARD color. For example, pinning `A` and painting a visible `A` cell to `B` hides the cell under the `A` filter but leaves a full-cell `B` code marker until the pin is cleared.
- Replace is a whole-color operation, not a single-cell paint gesture. Replacing all `A` with `B` must not create edited-away markers by itself.
- Edited-away markers are only pinned-grid affordances and disappear when the color pin is cleared.

No-bead cells render as empty cells, are excluded from usage counts, and do not display a MARD code.

## Local Persistence

Local IndexedDB pattern records store the effective row-major pattern, not only complete generated patterns.

- `cellCodes` contains one entry per grid cell.
- A `cellCodes` entry is either a stable MARD code or `null` for a no-bead cell.
- `totalBeads` equals the number of non-null `cellCodes`.
- `usage` must match the MARD-code histogram from non-null `cellCodes`.
- Source images and object URLs are not stored by this record schema.

## Counting

Generated output starts with every cell mapped to one bead. When manual edits exist, counting uses the effective cells and excludes no-bead cells.

- `totalBeads = cells.filter((cell) => cell.color).length`
- For complete generated patterns, `totalBeads = width * height`
- After erasing cells to no-bead, `totalBeads` can be less than `width * height`
- Summary rows are sorted by count descending, then by MARD code for stable ties.
- Summary counts are derived from cells, not from rendered UI text.

## Export

PNG and PDF exports are generated in the browser from the effective `Pattern`, not from a screenshot of the DOM. Manual paint, erase, replace, undo, redo, and reset operations therefore affect exported files through the same pattern contract used by the preview grid and counts. No-bead cells export as blank background cells without MARD codes.

The export renderer uses the current preview toggles:

- `显示网格` / show grid controls normal grid lines plus stronger 5/10 helper lines.
- `显示色号` / show color codes controls MARD code text inside cells.
- `显示行列编号` / show row/column labels controls the top, bottom, left, and right axes.

PDF export is a single-page image layout generated client-side. It is not a paginated assembly booklet and does not add a separate color-summary page.

## Known Limitations

- Fixed-size crop, zoom, or drag-to-frame controls are not implemented yet.
- Palette label overrides are optional; stable fallback labels use `MARD {code}`.
- Exported PDF files use a single-page pattern image; pagination and export metadata panels are not implemented yet.
- Large source image decoding depends on browser capabilities. The output grid itself is bounded to at most `100x100`.

## Verification

Use focused unit tests for deterministic utilities and browser/manual checks for file upload and visual grid output.

```sh
pnpm check
```

# Reference Feature Matrix

This document records current Fundbeads capability and backlog implications. It is a planning aid, not an executable implementation instruction.

## Current Capability Matrix

| Capability | Current Status | Owner / Contract | Backlog Notes |
| --- | --- | --- | --- |
| JPG upload | Supported locally in browser. | `frontend/src/App.tsx` | Keep local-only. |
| PNG upload | Supported locally in browser. Transparent pixels composite against white. | `frontend/src/App.tsx`, `frontend/src/pattern.ts` | Custom background is not planned yet. |
| WebP upload | Supported locally in browser when the browser can decode WebP. Transparent pixels composite against white. | `frontend/src/App.tsx`, `frontend/src/pattern.ts` | Keep MIME and `.webp` filename fallback support covered by tests. |
| Processing status | Upload and reprocessing work exposes visible localized status text and busy semantics while image processing is active. | `App`, `UploadWorkspace`, `frontend/src/i18n.tsx` | Progress percentages are not implemented. |
| Output dimensions | Longest-edge presets `52`, `64`, `78`, plus adjustable longest edge from `40` to `100`; width/height are derived from source image ratio, and the shorter side may be below `40` but not below `1`. | `PatternDimensions` and `dimensionsForAspectRatio` in `frontend/src/pattern.ts` | New bounds or presets require contract and UI updates. |
| Image pixelation | Canvas draws the full source image into aspect-ratio-derived output dimensions. | `imageFileToPattern` | Fixed-size crop/drag framing is not implemented. |
| Palette | Built-in static MARD 221 palette with top-action modal detail view. | `frontend/src/palette.ts`, `frontend/src/palettes/mard.ts`, `MardPaletteShowcase` | Future MARD editions must use a distinct slug and the same schema. |
| Color matching | Multiple local distance algorithms: Perceptual Oklab default, Fast RGB, Weighted RGB, and Lab Delta-E 76. Dither mode is selected separately: Off default, Floyd-Steinberg, or Ordered. | `nearestBeadColor`, `patternPixelsToPattern` | Future modes need deterministic tests and performance review. |
| Color controls | Left toolbar controls for distance algorithm, dither mode, smoothing level `0..3`, and max color count as a draggable slider with stepper controls from `2` to `64`, default `24`. | `PatternAdjustmentControls`, `PatternProcessingOptions` | More controls should stay compact and avoid crowding the grid. |
| Pattern grid | DOM grid with colored cells and MARD codes. Defaults to fit-to-screen. | `frontend/src/App.tsx` | Watch `100x100` DOM render cost and small-screen readability. |
| Axes | Top and bottom axes run from `1` to width; left and right axes run from `1` to height. | `PatternGrid` and `AxisCell` | Visibility can be toggled in preview and exports. |
| Counting lines | Stronger 5/10 helper lines in grid cells and axes. | `Row` styling | Visual verification required for grid changes. |
| Pattern zoom | Zoom in/out buttons plus Ctrl/Command + wheel while over the grid. | `PatternGrid` | Touch zoom is a backlog improvement. |
| Manual grid editing | Supported after generation with view, paint, pick, erase to no-bead empty cells, replace color, undo, redo, and reset. Pointer editing and keyboard board editing are supported; arrow keys move the active cell, and Enter or Space applies the active tool when applicable. Edits are session state and produce an effective `Pattern` for grid rendering and counts. | `frontend/src/pattern-edit.ts`, `PatternGrid` | Advanced tools such as flood fill, magic wand, lasso, multi-select, layers, and edit persistence UI are not implemented. |
| Pattern export | Browser-local PNG and PDF downloads render from the effective `Pattern` and current preview toggles for grid, MARD codes, and row/column labels. PDF export uses a single-page image layout. | `frontend/src/pattern-export.ts`, `PatternGrid` | Paginated assembly booklets, export metadata panels, and color-summary pages are not implemented. |
| Color usage summary | Compact color/bead totals under the original-image rail, plus a detailed right-rail swatch list with MARD code, count, and percent. | `summarizeCells`, `PatternStatsCard`, `ColorUsageDetail` | Counts must derive from effective cells. |
| UI languages | English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Spanish. | `frontend/src/i18n.tsx` | New locales require complete dictionaries and placeholder parity. |
| Palette display labels | Stable fallback labels use `MARD {code}`; optional overrides are keyed by MARD code. MARD codes stay untranslated. | `paletteLabels` in `frontend/src/i18n.tsx` | Reliable color-name coverage can be added later without changing palette identity. |
| Runtime themes | Classic, Midnight, Ocean, Candy, and Mono. | `frontend/src/themes.tsx`, `frontend/src/styles.css` | New themes require allowlist tests and contrast review. |
| Interface style | Modern, Pixel, Glass Desk, and Arcade Cabinet UI modes. Style modes are scoped under `data-ui-style` and do not change bead data colors. | `frontend/src/interface-style.tsx`, `frontend/src/App.tsx`, `frontend/src/styles.css` | New styles require allowlist tests, contrast review, and `100x100` grid readability checks. |
| Preferences | Language, theme, and interface style stored only in browser `localStorage` when available. | `frontend/src/browser-storage.ts` | Must remain optional and safe when storage is blocked. |
| Local pattern persistence infrastructure | IndexedDB module for compact, validated local pattern records. No history, draft, offline library, source-image save UI, or account sync UI is shipped yet. | `frontend/src/local-pattern-db.ts` | Future persistence UI must preserve local-only privacy, schema validation, pruning, and account-sync boundaries. |
| Future MARD editions | Not implemented. | Future instruction | MARD 288 or other editions need a new slug, data contract, tests, and docs. |
| Static deployment | Supported through Vite build and nginx Docker runtime. | `Dockerfile`, `docker-compose.yml` | No backend service. |

## Current MVP Risks

- `100x100` produces 10,000 bead cells plus axes. DOM rendering is bounded but should be checked when grid UI, zoom behavior, or dimension controls change.
- Cell code readability depends on background color and text contrast.
- The default fit-to-screen view may make dense grids too small to read on small displays; zoom controls are the intended detail path.
- Color matching is deterministic and bounded to the active `mard-221` palette. Dither modes are deterministic but can produce more speckled charts.
- Source images are sampled into aspect-ratio-derived dimensions. Fixed-size crop/drag framing is a backlog item for square or custom fixed outputs.
- Locale strings can expand significantly; selectors and compact controls should be checked when adding copy.
- Theme and interface style changes can reduce contrast if new token sets are not reviewed against grid axes, controls, summary text, and errors.
- Local-only processing must remain true as dependencies and export flows are added.
- Local pattern records are browser-local IndexedDB data. Future history/draft/library UI needs clear privacy copy, pruning behavior, and source-image opt-in rules.

## Backlog Implications

1. Paginated export, metadata panels, color-summary pages, recent history, draft restore, offline library, export cache, source-image saving, and account sync should build on the local persistence module but remain separate feature instructions.
2. Advanced manual editing tools such as flood fill, magic wand, lasso, rectangular selection, multi-select, layers, and edit persistence should remain separate feature instructions.
3. Future MARD editions, palette filtering, fixed-dimension crop/viewport controls, and mobile grid navigation are useful follow-ups but not current MVP scope.

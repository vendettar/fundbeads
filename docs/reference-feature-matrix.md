# Reference Feature Matrix

This document records current Fundbeads capability and backlog implications. It is a planning aid, not an executable implementation instruction.

## Current Capability Matrix

| Capability | Current Status | Owner / Contract | Backlog Notes |
| --- | --- | --- | --- |
| JPG upload | Supported locally in browser. | `frontend/src/App.tsx` | Keep local-only. |
| PNG upload | Supported locally in browser. Transparent pixels composite against white. | `frontend/src/App.tsx`, `frontend/src/pattern.ts` | Custom background is not planned yet. |
| Output dimensions | Longest-edge presets `52`, `64`, `78`, plus adjustable longest edge from `40` to `100`; width/height are derived from source image ratio. | `PatternDimensions` and `dimensionsForAspectRatio` in `frontend/src/pattern.ts` | New bounds or presets require contract and UI updates. |
| Image pixelation | Canvas draws the full source image into aspect-ratio-derived output dimensions. | `imageFileToPattern` | Fixed-size crop/drag framing is not implemented. |
| Palette | Built-in static MARD 221 palette. | `frontend/src/palette.ts`, `frontend/src/palettes/mard.ts` | Future MARD editions must use a distinct slug and the same schema. |
| Color matching | Squared RGB Euclidean nearest color. | `nearestBeadColor` | Alternative color spaces need a decision. |
| Pattern grid | DOM grid with colored cells and MARD codes. Defaults to fit-to-screen. | `frontend/src/App.tsx` | Watch `100x100` DOM render cost and small-screen readability. |
| Axes | Top and bottom axes run from `1` to width; left and right axes run from `1` to height. | `PatternGrid` and `AxisCell` | Must stay visible in future exports. |
| Counting lines | Stronger 5/10 helper lines in grid cells and axes. | `Row` styling | Visual verification required for grid changes. |
| Pattern zoom | Zoom in/out buttons plus Ctrl/Command + wheel while over the grid. | `PatternGrid` | Touch zoom is a backlog improvement. |
| Color usage summary | Compact color/bead totals under the original-image rail, plus a detailed swatch list with MARD code, label, and count below the grid. | `summarizeCells`, `PatternStatsCard`, `ColorSummary` | Counts must derive from cells. |
| UI languages | English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Spanish. | `frontend/src/i18n.tsx` | New locales require complete dictionaries and placeholder parity. |
| Palette display labels | Stable fallback labels use `MARD {code}`; optional overrides are keyed by MARD code. MARD codes stay untranslated. | `paletteLabels` in `frontend/src/i18n.tsx` | Reliable color-name coverage can be added later without changing palette identity. |
| Runtime themes | Classic, Midnight, Ocean, Candy, and Mono. | `frontend/src/themes.tsx`, `frontend/src/styles.css` | New themes require allowlist tests and contrast review. |
| Interface style | Modern and Pixel UI modes. Pixel mode is scoped under `data-ui-style` and does not change bead data colors. | `frontend/src/interface-style.tsx`, `frontend/src/App.tsx`, `frontend/src/styles.css` | New styles require allowlist tests, contrast review, and `100x100` grid readability checks. |
| Preferences | Language, theme, and interface style stored only in browser `localStorage` when available. | `frontend/src/browser-storage.ts` | Must remain optional and safe when storage is blocked. |
| Local pattern persistence infrastructure | IndexedDB module for compact, validated local pattern records. No history, draft, offline library, source-image save UI, or account sync UI is shipped yet. | `frontend/src/local-pattern-db.ts` | Future persistence UI must preserve local-only privacy, schema validation, pruning, and account-sync boundaries. |
| Printable export | Not implemented. | Future instruction | See `agent/instructions/future/002-printable-pattern-export.md`. |
| Future MARD editions | Not implemented. | Future instruction | MARD 288 or other editions need a new slug, data contract, tests, and docs. |
| Static deployment | Supported through Vite build and nginx Docker runtime. | `Dockerfile`, `docker-compose.yml` | No backend service. |

## Current MVP Risks

- `100x100` produces 10,000 bead cells plus axes. DOM rendering is bounded but should be checked when grid UI, zoom behavior, or dimension controls change.
- Cell code readability depends on background color and text contrast.
- The default fit-to-screen view may make dense grids too small to read on small displays; zoom controls are the intended detail path.
- Color matching is deterministic and bounded to the active `mard-221` palette.
- Source images are sampled into aspect-ratio-derived dimensions. Fixed-size crop/drag framing is a backlog item for square or custom fixed outputs.
- Locale strings can expand significantly; selectors and compact controls should be checked when adding copy.
- Theme and interface style changes can reduce contrast if new token sets are not reviewed against grid axes, controls, summary text, and errors.
- Local-only processing must remain true as dependencies and export flows are added.
- Local pattern records are browser-local IndexedDB data. Future history/draft/library UI needs clear privacy copy, pruning behavior, and source-image opt-in rules.

## Backlog Implications

1. Printable export should define format, pagination, metadata, local-only guarantees, and summary parity before implementation.
2. Recent history, draft restore, offline library, export cache, source-image saving, and account sync should build on the local persistence module but remain separate feature instructions.
3. Future MARD editions, palette filtering, fixed-dimension crop/viewport controls, and mobile grid navigation are useful follow-ups but not current MVP scope.

# Reference Feature Matrix

This document records current Fundbeads capability and backlog implications. It is a planning aid, not an executable implementation instruction.

## Current Capability Matrix

| Capability | Current Status | Owner / Contract | Backlog Notes |
| --- | --- | --- | --- |
| JPG upload | Supported locally in browser. | `frontend/src/App.tsx` | Keep local-only. |
| PNG upload | Supported locally in browser. Transparent pixels composite against white. | `frontend/src/App.tsx`, `frontend/src/pattern.ts` | Custom background is not planned yet. |
| Output grid sizes | `52x52`, `64x64`, `78x78`. | `GridSize` in `frontend/src/pattern.ts` | New sizes require contract and UI updates. |
| Image pixelation | Canvas draws source image into selected square size. | `imageFileToPattern` | Crop/fit controls are not implemented. |
| Palette | Mock MARD subset with 28 colors. | `frontend/src/palette.ts` | Full 221-color palette is backlog. |
| Color matching | Squared RGB Euclidean nearest color. | `nearestBeadColor` | Alternative color spaces need a decision. |
| Pattern grid | DOM grid with colored cells and MARD codes. Defaults to fit-to-screen. | `frontend/src/App.tsx` | Watch 78x78 DOM render cost and small-screen readability. |
| Axes | Top, bottom, left, and right axes from `1` to grid size. | `PatternGrid` and `AxisCell` | Must stay visible in future exports. |
| Counting lines | Stronger 5/10 helper lines in grid cells and axes. | `Row` styling | Visual verification required for grid changes. |
| Pattern zoom | Zoom in/out buttons plus Ctrl/Command + wheel while over the grid. | `PatternGrid` | Touch zoom is a backlog improvement. |
| Color usage summary | Swatch, MARD code, label, count, and total summary. | `summarizeCells`, `ColorSummary` | Counts must derive from cells. |
| UI languages | English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Spanish. | `frontend/src/i18n.tsx` | New locales require complete dictionaries and placeholder parity. |
| Palette display labels | Localized display labels for the current mock palette. MARD codes stay untranslated. | `paletteLabels` in `frontend/src/i18n.tsx` | Full palette migration must include label coverage by code. |
| Runtime themes | Classic, Midnight, Ocean, Candy, and Mono. | `frontend/src/themes.tsx`, `frontend/src/styles.css` | New themes require allowlist tests and contrast review. |
| Preferences | Language and theme stored only in browser `localStorage` when available. | `frontend/src/browser-storage.ts` | Must remain optional and safe when storage is blocked. |
| Printable export | Not implemented. | Future instruction | See `agent/instructions/future/002-printable-pattern-export.md`. |
| Full MARD 221 colors | Not implemented. | Future instruction | See `agent/instructions/future/001-full-mard-221-palette.md`. |
| Static deployment | Supported through Vite build and nginx Docker runtime. | `Dockerfile`, `docker-compose.yml` | No backend service. |

## Current MVP Risks

- `78x78` produces 6,084 bead cells plus axes. DOM rendering is bounded but should be checked when grid UI or zoom behavior changes.
- Cell code readability depends on background color and text contrast.
- The default fit-to-screen view may make dense grids too small to read on small displays; zoom controls are the intended detail path.
- Color matching is deterministic but only as accurate as the mock palette data.
- Source images are stretched into a square grid. This is acceptable for the MVP but should be revisited before export polish.
- Locale strings can expand significantly; selectors and compact controls should be checked when adding copy.
- Theme changes can reduce contrast if new token sets are not reviewed against grid axes, controls, summary text, and errors.
- Local-only processing must remain true as dependencies and export flows are added.

## Backlog Implications

1. Full MARD 221 palette should land before claiming palette completeness.
2. Printable export should define format, pagination, metadata, local-only guarantees, and summary parity before implementation.
3. Palette filtering, crop/fit controls, and mobile grid navigation are useful follow-ups but not current MVP scope.

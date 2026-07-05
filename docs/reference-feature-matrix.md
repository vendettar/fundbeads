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
| Pattern grid | DOM grid with colored cells and MARD codes. | `frontend/src/App.tsx` | Watch 78x78 DOM render cost. |
| Axes | Top, bottom, left, and right axes from `1` to grid size. | `PatternGrid` and `AxisCell` | Must stay visible in future exports. |
| Counting lines | Stronger 5/10 helper lines in grid cells and axes. | `Row` styling | Visual verification required for grid changes. |
| Color usage summary | Swatch, MARD code, label, count, and total summary. | `summarizeCells`, `ColorSummary` | Counts must derive from cells. |
| Printable export | Not implemented. | Future instruction | See `agent/instructions/future/002-printable-pattern-export.md`. |
| Full MARD 221 colors | Not implemented. | Future instruction | See `agent/instructions/future/001-full-mard-221-palette.md`. |
| Static deployment | Supported through Vite build and nginx Docker runtime. | `Dockerfile`, `docker-compose.yml` | No backend service. |

## Current MVP Risks

- `78x78` produces 6,084 bead cells plus axes. DOM rendering is bounded but should be checked when grid UI changes.
- Cell code readability depends on background color and text contrast.
- Color matching is deterministic but only as accurate as the mock palette data.
- Source images are stretched into a square grid. This is acceptable for the MVP but should be revisited before export polish.
- Local-only processing must remain true as dependencies and export flows are added.

## Backlog Implications

1. Full MARD 221 palette should land before claiming palette completeness.
2. Printable export should define format, pagination, metadata, local-only guarantees, and summary parity before implementation.
3. Palette filtering, crop/fit controls, and mobile grid navigation are useful follow-ups but not current MVP scope.

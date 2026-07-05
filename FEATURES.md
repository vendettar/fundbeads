# Fundbeads Features

This file lists the current shipped feature surface. Planned items are not implemented yet.

## Current

- Local JPG/PNG upload through the browser file input.
- Browser-local image decoding, canvas sampling, palette matching, and counting.
- Output sizes: `52x52`, `64x64`, and `78x78`.
- Mock MARD palette with 28 labeled colors.
- Nearest-color matching by squared RGB Euclidean distance.
- Transparent PNG pixels composited against white before matching.
- Labeled pattern grid with one visible cell per bead.
- MARD code shown inside every bead cell.
- Top, bottom, left, and right numbered axes.
- Stronger helper lines every 5 and 10 cells.
- Default fit-to-screen grid view.
- Zoom in/out controls for inspecting dense grids.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, to zoom while the pointer is over the pattern grid.
- Color usage summary with swatch, MARD code, label, count, used color count, grid size, and total bead count.
- UI language selector for English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Spanish.
- Localized UI copy and display-only palette labels for the current mock palette.
- Theme selector with Classic, Midnight, Ocean, Candy, and Mono themes.
- Language and theme preferences stored only in browser `localStorage` when available.
- Static build and nginx Docker runtime.

## Current Limitations

- The palette is a mock subset, not the full MARD 221-color dataset.
- The source image is stretched into a square grid. Crop/fit controls are not implemented.
- Printable export is not implemented.
- Palette filtering is not implemented.
- Very small screens may need zooming to read individual bead codes.
- Translations are maintained in static source files; there is no remote translation service.

## Planned

- Verified full MARD 221-color palette.
- Client-side printable pattern export.
- Optional palette filtering.
- Better mobile grid navigation and touch zoom gestures.

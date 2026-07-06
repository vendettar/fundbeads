# Fundbeads Features

This file lists the current shipped feature surface. Planned items are not implemented yet.

## Current

- Local JPG/PNG upload through the browser file input.
- Browser-local image decoding, canvas sampling, palette matching, and counting.
- Longest-edge presets: `52`, `64`, and `78`, with an adjustable longest edge from `40` to `100`.
- Aspect-ratio preserving output dimensions, such as `80x45` for a `16:9` image with longest edge `80`.
- Built-in static MARD 221 palette.
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
- Localized UI copy with stable MARD code labels and optional palette label overrides.
- Theme selector with Classic, Midnight, Ocean, Candy, and Mono themes.
- Interface style selector with Modern and Pixel UI modes.
- Language, theme, and interface style preferences stored only in browser `localStorage` when available.
- Static build and nginx Docker runtime.

## Current Limitations

- Palette matching uses the built-in MARD 221 RGB dataset.
- Output dimensions are derived from the source image ratio and selected longest edge. Fixed-size crop/drag framing is not implemented yet.
- Printable export is not implemented.
- Palette filtering is not implemented.
- Very small screens may need zooming to read individual bead codes.
- Translations are maintained in static source files; there is no remote translation service.

## Planned

- Client-side printable pattern export.
- Optional palette filtering.
- Better mobile grid navigation and touch zoom gestures.

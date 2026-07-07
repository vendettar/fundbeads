# Fundbeads Features

This file lists the current shipped feature surface. Planned items are not implemented yet.

## Current

- Local JPG/PNG/WebP upload through the browser file input.
- Browser-local image decoding, canvas sampling, palette matching, and counting.
- Longest-edge presets: `52`, `64`, and `78`, with an adjustable longest edge from `40` to `100`.
- Aspect-ratio preserving output dimensions, such as `64x36` for a `16:9` image with longest edge `64`; the shorter side may be below `40`.
- Built-in static MARD 221 palette.
- Color-distance algorithms: Perceptual Oklab default, Fast RGB, Weighted RGB, and Lab Delta-E 76.
- Dither modes: Off default, Floyd-Steinberg, and Ordered.
- Smoothing level control from `0` to `3`.
- Max color count control: bounded draggable slider with stepper controls, minimum `2`, maximum `64`, default `24`.
- Transparent PNG/WebP pixels composited against white before matching.
- Labeled pattern grid with one visible cell per bead.
- MARD code shown inside every bead cell.
- Top, bottom, left, and right numbered axes.
- Stronger helper lines every 5 and 10 cells.
- Default fit-to-screen grid view.
- Zoom in/out controls for inspecting dense grids.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, to zoom while the pointer is over the pattern grid.
- Post-generation grid editing: paint with a MARD 221 color, pick a cell color, erase cells to no-bead empty cells, replace one effective color with another, undo, redo, and reset.
- Browser-local PNG and PDF export from the pattern preview toolbar, using the current grid, MARD code, and row/column label visibility toggles.
- Color usage summary with swatch, MARD code, count, percent, used color count, grid size, and total bead count.
- UI language selector for English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Spanish.
- Localized UI copy with stable MARD code labels and optional palette label overrides.
- Theme selector with Classic, Midnight, Ocean, Candy, and Mono themes.
- Interface style selector with Modern, Pixel, Glass Desk, and Arcade Cabinet UI modes.
- Language, theme, interface style, and generation-control preferences are stored only in browser `localStorage` when available.
- The latest workspace is restored from browser-local IndexedDB after refresh: source image blob, effective generated pattern, source image size, and generation settings.
- Static build and nginx Docker runtime.

## Current Limitations

- Palette matching uses the built-in MARD 221 RGB dataset with local distance and dither modes; it does not use remote palette services.
- Dithered modes can create speckled charts and may increase bead-picking complexity.
- Output dimensions are derived from the source image ratio and selected longest edge; the shorter side may be below `40` when the source ratio requires it. Fixed-size crop/drag framing is not implemented yet.
- Manual edits are included in the latest restored workspace because the effective pattern is saved locally. Multi-item history, named drafts, offline library UI, and account sync are not implemented.
- PDF export is a single-page image export of the current pattern preview, not a paginated assembly booklet.
- Palette filtering is not implemented.
- Very small screens may need zooming to read individual bead codes.
- Translations are maintained in static source files; there is no remote translation service.

## Planned

- Optional palette filtering.
- Better mobile grid navigation and touch zoom gestures.

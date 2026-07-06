# Fundbeads

Fundbeads is a client-side Perler Bead / Fuse Bead pattern maker. It turns a local JPG, PNG, or WebP into a labeled, counted bead grid using the built-in MARD 221 palette.

## Installation

Install dependencies from the repository root:

```sh
pnpm install
```

## Quick Start

Generate design tokens and start the development server:

```sh
pnpm design:generate
pnpm dev
```

Open the Vite URL shown in the terminal. By default it is:

```txt
http://localhost:5173
```

Upload a JPG, PNG, or WebP, choose a longest-edge preset such as `52`, `64`, or `78`, or adjust the longest edge from `40` to `100`; the app will preserve the image ratio and generate the pattern locally in the browser. The derived shorter side may be below `40` for wide or tall images, but it is never below `1`.

## What Fundbeads Does

Fundbeads converts an uploaded image into a bead-placement chart. Each generated cell represents one bead, uses the nearest MARD 221 palette color, and displays the MARD code inside the cell.

The current app includes:

- Local JPG/PNG/WebP upload.
- Longest-edge presets: `52`, `64`, and `78`, with an adjustable longest edge from `40` to `100`.
- Aspect-ratio preserving output dimensions, such as `64x36` for a `16:9` image with longest edge `64`.
- Browser-local image decoding and canvas sampling.
- A built-in static MARD 221 palette.
- RGB Euclidean nearest-color matching.
- A high-contrast grid with top, bottom, left, and right axes.
- Stronger helper lines every 5 and 10 cells.
- Default fit-to-screen pattern viewing with zoom in/out controls.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, to zoom while the pointer is over the pattern grid.
- Post-generation grid editing with paint, pick, erase to MARD `H1` white, replace color, undo, redo, and reset controls.
- Color usage summary with swatch, MARD code, count, percent, grid size, color count, and total bead count.
- UI language selector for `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, and `es`.
- Theme selector for Classic, Midnight, Ocean, Candy, and Mono themes.
- Interface style selector for Modern and Pixel UI modes.

## Local-Only Safety Model

Uploaded images are processed in the browser. The project does not include a backend, server-side database, API server, image upload endpoint, telemetry sink, or third-party image-processing service.

Language, theme, and interface style preferences are stored only in browser `localStorage` when available. The app continues to run if preference storage is blocked.

The Docker image serves static files only.

## Project Layout

- `frontend/`: Vite React application.
- `frontend/src/pattern.ts`: Image sampling, color matching, pattern contracts, and count summaries.
- `frontend/src/pattern-edit.ts`: Browser-session pattern editing, effective pattern reconstruction, and edit history.
- `frontend/src/palette.ts`: Stable exports for the active MARD palette contract.
- `frontend/src/palettes/mard.ts`: Built-in static MARD 221 palette data.
- `frontend/src/i18n.tsx`: Supported locales, translations, optional palette label overrides, and i18n provider.
- `frontend/src/themes.tsx`: Supported theme ids, preference handling, and theme provider.
- `frontend/src/interface-style.tsx`: Supported interface style ids, preference handling, and interface style provider.
- `frontend/src/browser-storage.ts`: Safe optional access to browser preference storage.
- `scripts/generate-design-theme.mjs`: Generates CSS variables from `DESIGN.md`.
- `docs/`: Engineering docs, architecture, design rules, runtime notes, and decisions.
- `agent/instructions/`: Implementation instructions and backlog candidates.
- `agent/role-prompt/`: Fundbeads-specific agent roles.

## Useful Commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `pnpm design:generate` | Validate `DESIGN.md` and regenerate `frontend/src/design-theme.generated.css`. |
| `pnpm design:lint` | Lint `DESIGN.md`. |
| `pnpm dev` | Start the Vite dev server. |
| `pnpm build:frontend` | Typecheck and build the frontend. |
| `pnpm test:frontend` | Run frontend tests. |
| `pnpm check` | Run the build and test gate. |
| `pnpm preview:frontend` | Preview the production build locally. |

## Docker

Build and run the static container:

```sh
docker compose up --build
```

Open:

```txt
http://localhost:3000
```

The container serves the built frontend with nginx.

## Documentation

Start with [docs/index.md](docs/index.md).

Key docs:

- [docs/architecture.md](docs/architecture.md)
- [docs/pattern-processing.md](docs/pattern-processing.md)
- [docs/design-rules.md](docs/design-rules.md)
- [docs/runtime-and-deployment.md](docs/runtime-and-deployment.md)
- [docs/decision-log.md](docs/decision-log.md)
- [docs/reference-feature-matrix.md](docs/reference-feature-matrix.md)

## Planned Work

Planned items are not current features:

- Add client-side printable pattern export.
- Add optional palette filtering.
- Improve mobile grid navigation.

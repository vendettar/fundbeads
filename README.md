# Fundbeads

Fundbeads is a client-side Perler Bead / Fuse Bead pattern maker. It turns a local JPG or PNG into a labeled, counted bead grid using a mock MARD palette.

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

Upload a JPG or PNG, choose `52x52`, `64x64`, or `78x78`, and the app will generate the pattern locally in the browser.

## What Fundbeads Does

Fundbeads converts an uploaded image into a bead-placement chart. Each generated cell represents one bead, uses the nearest mock MARD palette color, and displays the MARD code inside the cell.

The current app includes:

- Local JPG/PNG upload.
- Output grid sizes: `52x52`, `64x64`, and `78x78`.
- Browser-local image decoding and canvas sampling.
- A hardcoded 28-color mock MARD palette.
- RGB Euclidean nearest-color matching.
- A high-contrast grid with top, bottom, left, and right axes.
- Stronger helper lines every 5 and 10 cells.
- Default fit-to-screen pattern viewing with zoom in/out controls.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, to zoom while the pointer is over the pattern grid.
- Color usage summary with swatch, MARD code, label, count, grid size, color count, and total bead count.

## Local-Only Safety Model

Uploaded images are processed in the browser. The project does not include a backend, database, API server, image upload endpoint, telemetry sink, or third-party image-processing service.

The Docker image serves static files only.

## Project Layout

- `frontend/`: Vite React application.
- `frontend/src/pattern.ts`: Image sampling, color matching, pattern contracts, and count summaries.
- `frontend/src/palette.ts`: Current mock MARD palette subset.
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

- Replace the mock palette with a verified full MARD 221-color dataset.
- Add client-side printable pattern export.
- Add optional palette filtering.
- Improve mobile grid navigation.

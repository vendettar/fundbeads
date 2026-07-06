# Runtime and Deployment

Fundbeads is built as static frontend assets. There is no backend service and no server-side image processing.

## Runtime Boundary Model

- **Browser app**: React/Vite code runs in the user's browser.
- **Image processing**: JPG/PNG/WebP decoding, canvas sampling, palette matching, and counting happen locally in the browser.
- **Preferences**: Language, theme, and interface style preferences use browser `localStorage` only when available.
- **Local pattern persistence**: IndexedDB infrastructure can store compact, validated pattern records in the user's browser when explicitly called.
- **Static assets**: Production builds produce `frontend/dist`.
- **Docker runtime**: nginx serves the compiled static files.
- **Mutable server state**: None.

## Package Scripts

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install root and workspace dependencies. |
| `pnpm design:generate` | Validate `DESIGN.md` and regenerate `frontend/src/design-theme.generated.css`. |
| `pnpm design:lint` | Lint `DESIGN.md` with `@google/design.md`. |
| `pnpm dev` | Start the Vite dev server through the workspace script. |
| `pnpm dev:frontend` | Start only the frontend dev server. |
| `pnpm build:frontend` | Typecheck and build the frontend. |
| `pnpm test:frontend` | Run frontend tests. |
| `pnpm check` | Run the configured build and test gate. |
| `pnpm preview:frontend` | Preview the production frontend build locally. |

## Local Development

```sh
pnpm install
pnpm design:generate
pnpm dev
```

The Vite dev server defaults to port `5173`. `frontend/vite.config.ts` reads `VITE_DEV_PORT` if another port is needed.

```sh
VITE_DEV_PORT=5174 pnpm dev
```

## Production Build

```sh
pnpm design:generate
pnpm build:frontend
```

The built files are written to `frontend/dist`.

## Preview

```sh
pnpm preview:frontend
```

## Docker

The Dockerfile uses two stages:

1. `node:22-bookworm` installs dependencies, regenerates design tokens, and builds the frontend.
2. `nginx:1.27-alpine` serves `/usr/share/nginx/html`.

Run locally:

```sh
docker compose up --build
```

The compose file maps host port `3000` to container port `80`.

Open:

```txt
http://localhost:3000
```

## Deployment Contract

- The runtime container is static-only.
- There are no API routes.
- There is no image upload endpoint.
- There is no server-side database or server-side persistence.
- Normal generation keeps uploaded images, generated patterns, and bead counts in browser memory.
- The local pattern persistence module stores compact records in browser IndexedDB only when explicitly called by current or future UI flows.
- Local pattern records store row-major MARD codes and usage counts; they do not store object URLs or automatically persist uploaded source images.
- IndexedDB records are local to the user's browser. They are not account authority and are not synchronized to a server by the static runtime.
- Language, theme, and interface style preference keys are optional browser-local state only.
- Translations, theme ids, interface style ids, and display labels are bundled static source data.
- There is no remote translation, remote theme, telemetry, CDN, or analytics dependency.

## Verification

```sh
pnpm design:generate
pnpm check
```

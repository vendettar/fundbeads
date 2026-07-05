# Runtime and Deployment

Fundbeads is built as static frontend assets. There is no backend service and no server-side image processing.

## Runtime Boundary Model

- **Browser app**: React/Vite code runs in the user's browser.
- **Image processing**: JPG/PNG decoding, canvas sampling, palette matching, and counting happen locally in the browser.
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
- There is no database or server-side persistence.
- Uploaded images, generated patterns, and bead counts remain in browser memory unless a future client-side export feature is added.

## Verification

```sh
pnpm design:generate
pnpm check
```

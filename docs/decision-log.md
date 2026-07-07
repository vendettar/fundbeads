# Fundbeads Decision Log

This document records durable product, architecture, runtime, and design decisions for Fundbeads.

## 1. Client-Only Static Application

**Decision**: Fundbeads is a single-page browser application with no backend service.

**Rationale**: The core workflow can run with browser file input, canvas sampling, and local TypeScript utilities. Keeping the app static protects the local-only image handling promise and simplifies deployment.

**Implications**:

- Uploaded images must not leave the browser.
- Docker serves static assets only.
- No server-side database, API server, or upload service is part of the current architecture.

## 2. Vite, React, TypeScript, and Tailwind CSS v4

**Decision**: The frontend uses Vite, React, TypeScript, and Tailwind CSS v4.

**Rationale**: This stack gives fast local development, strict compile-time checks, and a compact styling model for a single-page tool.

**Implications**:

- Frontend source lives under `frontend/`.
- Root pnpm scripts delegate into the frontend workspace.
- Tailwind semantic tokens are defined in `frontend/src/styles.css`.

## 3. DESIGN.md Token Generation

**Decision**: `DESIGN.md` is the source for default Classic theme tokens, and `scripts/generate-design-theme.mjs` generates `frontend/src/design-theme.generated.css`.

**Rationale**: A lintable design source keeps docs, design intent, and CSS variables aligned.

**Implications**:

- Do not hand-edit `frontend/src/design-theme.generated.css`.
- Default theme-token changes require `pnpm design:generate`.
- Named runtime themes override the generated `--beads-*` variables in application CSS.
- Broad verification should include `pnpm design:generate`.

## 4. Built-In MARD 221 Palette

**Decision**: Fundbeads uses `mard-221` as the active built-in static MARD palette.

**Rationale**: Pattern generation needs a complete, deterministic bead palette contract. Keeping MARD 221 as bundled static data preserves local-only processing and avoids runtime dependency on remote palette services.

**Implications**:

- `mard-221` is the canonical active palette slug.
- Palette `code` is the stable identity; `label` is display copy.
- Future MARD editions, such as `mard-288`, must use the same static palette schema with a distinct slug and validation tests.
- Runtime code, docs, and tests should not describe the active palette as mock.

## 5. Local Color-Distance Matching and Dithering

**Decision**: Sampled RGB colors are matched to the nearest palette entry by a local, deterministic color-distance mode. The default mode is Perceptual Oklab. Fast RGB, Weighted RGB, and Lab Delta-E 76 are selectable alternatives. Dither mode is selected separately, with Off as the default and Floyd-Steinberg and Ordered as selectable modes.

**Rationale**: Perceptual Oklab gives a better default match for most photos and artwork while keeping processing local and bounded. RGB and Lab alternatives remain useful for predictable comparisons, pixel art, and traditional color-difference workflows. Keeping dithering separate lets users choose between clean solid regions and more textured gradients.

**Implications**:

- Matching behavior belongs in pure utilities.
- Tests should cover representative nearest-color outcomes for each distance mode.
- Dither modes must remain deterministic and preserve row-major coordinates, transparent-pixel compositing, and count totals.
- When two colors have the same distance, current behavior keeps the first matching palette entry by array order.
- Future distance or dither modes require deterministic tests, performance review, and documentation updates.

## 6. White Background for Transparent Pixels

**Decision**: Transparent PNG pixels are alpha-composited against white before palette matching.

**Rationale**: Transparent pixels need deterministic output. White background compositing is simple, visible, and easy to explain.

**Implications**:

- Transparent images always produce bead cells.
- A checkerboard, custom background, or transparent bead concept would require a new instruction and decision.

## 7. DOM-Based Labeled Pattern Grid

**Decision**: The current pattern grid is rendered as DOM cells with per-cell MARD codes rather than as a single canvas image.

**Rationale**: DOM cells keep bead codes inspectable, support tooltips, and make axes/counting lines straightforward in the MVP.

**Implications**:

- `100x100` rendering performance must be watched.
- Grid cells must remain stable and scrollable.
- A future canvas/SVG export can be added without replacing the interactive grid unless a later decision approves it.

## 8. Static Docker Runtime

**Decision**: Docker builds the frontend and serves it with nginx.

**Rationale**: Static hosting is enough for the current product and keeps deployment simple.

**Implications**:

- The runtime image has no app server.
- `docker-compose.yml` maps host port `3000` to nginx port `80`.
- Server-side image handling is out of scope.

## 9. Fit-to-Screen Pattern Viewing with Manual Zoom

**Decision**: The pattern grid defaults to a fit-to-screen view and provides manual zoom controls.

**Rationale**: A default scroll-heavy grid is awkward for dense bead charts. Users need to see the full pattern first, then zoom in when they want to inspect or place individual beads.

**Implications**:

- The default generated grid should fit inside the pattern viewport without grid scrollbars.
- Zoom in/out buttons are part of the grid interaction contract.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, zooms the pattern when the pointer is over the grid.
- Internal grid scrolling is acceptable after the user zooms beyond the fitted size.
- Very small screens may require zooming before individual bead codes are readable.

## 10. Static Client-Side Themes and i18n

**Decision**: Fundbeads supports source-defined UI languages and themes entirely in the frontend bundle.

**Rationale**: Theme and language selection improves usability without changing the local-only runtime model. Static dictionaries and theme ids avoid remote translation/theme services and keep static deployment simple.

**Implications**:

- Supported locales are `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, and `es`.
- Supported theme ids are `classic`, `midnight`, `ocean`, `candy`, and `mono`.
- Language and theme preferences are stored only in browser `localStorage` when available.
- Preference reads and writes must tolerate blocked storage.
- MARD color codes remain stable and untranslated; localized palette labels are display-only.
- New locales or themes require dictionary/label coverage tests and documentation updates.

## 11. Browser-Local IndexedDB Pattern Store

**Decision**: Fundbeads includes IndexedDB infrastructure for compact, browser-local pattern records.

**Rationale**: Upcoming recent-history, draft restore, offline library, export cache, and account-sync flows need a durable browser-local foundation. Keeping the first layer in IndexedDB preserves the static deployment model and avoids introducing a backend before account features are explicitly designed.

**Implications**:

- `fundbeads-pattern-store` is a browser-local UX/cache layer, not account authority.
- Persisted records store `width`, `height`, `paletteSlug`, `paletteVersion`, row-major MARD-or-null `cellCodes`, usage counts, total beads, timestamps, and local-only sync metadata.
- Records are validated against the active `mard-221` palette before reconstruction.
- Source images are not automatically persisted. Any source-image blob storage must be explicit, bounded, and covered by a future instruction.
- Object URLs must never be persisted.
- The static runtime still has no API routes, upload endpoint, server-side database, telemetry, or account sync.
- Future login/sync work must treat IndexedDB records as client-provided data and validate server-side ownership independently.

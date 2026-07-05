# Fundbeads Decision Log

This document records durable product, architecture, runtime, and design decisions for Fundbeads.

## 1. Client-Only Static Application

**Decision**: Fundbeads is a single-page browser application with no backend service.

**Rationale**: The core workflow can run with browser file input, canvas sampling, and local TypeScript utilities. Keeping the app static protects the local-only image handling promise and simplifies deployment.

**Implications**:

- Uploaded images must not leave the browser.
- Docker serves static assets only.
- No database, API server, or upload service is part of the current architecture.

## 2. Vite, React, TypeScript, and Tailwind CSS v4

**Decision**: The frontend uses Vite, React, TypeScript, and Tailwind CSS v4.

**Rationale**: This stack gives fast local development, strict compile-time checks, and a compact styling model for a single-page tool.

**Implications**:

- Frontend source lives under `frontend/`.
- Root pnpm scripts delegate into the frontend workspace.
- Tailwind semantic tokens are defined in `frontend/src/styles.css`.

## 3. DESIGN.md Token Generation

**Decision**: `DESIGN.md` is the source for theme tokens, and `scripts/generate-design-theme.mjs` generates `frontend/src/design-theme.generated.css`.

**Rationale**: A lintable design source keeps docs, design intent, and CSS variables aligned.

**Implications**:

- Do not hand-edit `frontend/src/design-theme.generated.css`.
- Theme-token changes require `pnpm design:generate`.
- Broad verification should include `pnpm design:generate`.

## 4. Mock MARD Palette First

**Decision**: The MVP uses a hardcoded mock MARD palette subset with 28 colors.

**Rationale**: The processing pipeline can be built and tested before the full 221-color dataset is sourced and verified.

**Implications**:

- Current docs must describe the palette as mock.
- Full 221-color support requires source traceability, data validation, tests, and a decision-log update.
- Palette `code` is the stable identity; `label` is display copy.

## 5. RGB Euclidean Matching

**Decision**: Sampled RGB colors are matched to the nearest palette entry by squared RGB Euclidean distance.

**Rationale**: RGB distance is simple, deterministic, and matches the current MVP requirement.

**Implications**:

- Matching behavior belongs in pure utilities.
- Tests should cover representative nearest-color outcomes.
- Alternative color spaces require a new decision.

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

- 78x78 rendering performance must be watched.
- Grid cells must remain stable and scrollable.
- A future canvas/SVG export can be added without replacing the interactive grid unless a later decision approves it.

## 8. Static Docker Runtime

**Decision**: Docker builds the frontend and serves it with nginx.

**Rationale**: Static hosting is enough for the current product and keeps deployment simple.

**Implications**:

- The runtime image has no app server.
- `docker-compose.yml` maps host port `3000` to nginx port `80`.
- Server-side image handling is out of scope.

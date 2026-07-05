# 005 Client-Side Polish and Release Readiness

## Goal

Bring the single-page app to a clean, modern, intuitive baseline that is ready for local use and static deployment.

## Scope

- Frontend user experience, docs, generated design tokens, build scripts, and Docker/static deployment.

## Required Changes

- Keep the first screen as the actual tool, not a marketing landing page.
- Use Tailwind CSS for styling and preserve generated `DESIGN.md` theme tokens.
- Keep the UI responsive across desktop and mobile widths.
- Ensure controls have accessible labels or readable text.
- Ensure processing status and validation errors are visible.
- Keep all processing local to the browser.
- Document local development, build, preview, and Docker usage.
- Keep Docker deployment static-only.

## Forbidden

- Do not introduce auth, database state, backend APIs, image upload services, or server-side processing.
- Do not edit `frontend/src/design-theme.generated.css` directly.
- Do not document planned features as shipped features.
- Do not use a landing-page hero instead of the working tool.

## Implementation Notes

- Use restrained, utilitarian visual design suitable for a craft production tool.
- Avoid server routes, databases, auth, or external image-processing services.
- Keep future work such as full 221-color palette and export features in docs or backlog instructions.
- Use semantic Tailwind tokens backed by generated design variables.

## Verification

- Run `pnpm design:generate`.
- Run `pnpm check`.
- Run the Vite dev server and manually test upload, resolution switching, grid reading, and summary counts.
- Build the Docker image or confirm the Dockerfile only serves static assets.
- Review docs for setup accuracy.

## Done When

- The project has a verified client-only MVP and clear instructions for continuing development.
- Root docs, engineering docs, features docs, and agent prompts agree on the current state.

## Decision Log

Required if runtime topology, deployment model, design token source, or local-only guarantee changes.

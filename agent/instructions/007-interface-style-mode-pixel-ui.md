# 007 Interface Style Mode and Pixel UI [COMPLETED]

## Goal

Add a top-level interface style mode for Fundbeads so users can switch between the current default UI and a pixel-inspired UI that fits the bead-pattern product language.

This is not a color theme. Existing color themes control the semantic color palette. Interface style controls UI shape, density, borders, shadows, typography feel, background treatment, and interaction affordances.

## Role Team

Use the Fundbeads role prompts before implementation. If the runtime supports subagents, spawn role-specific reviewers for the changed surfaces. If subagents are unavailable, perform these role checks explicitly in the main implementation report.

- `agent/role-prompt/top-role.md`: confirm scope, role routing, and boundaries.
- `agent/role-prompt/ui-designer-role.md`: own visual direction, control placement, responsive behavior, accessibility, and no-overlap checks.
- `agent/role-prompt/worker-role.md`: implement the approved instruction in the smallest coherent file set.
- `agent/role-prompt/pattern-contract-role.md`: verify that pattern, palette, grid-size, and count contracts are untouched.
- `agent/role-prompt/security-role.md`: verify no image upload, telemetry, remote font, remote CSS, or remote theme loading is introduced.
- `agent/role-prompt/performance-role.md`: verify the pixel style does not add expensive render work to the `78x78` grid path.
- `agent/role-prompt/qa-role.md`: define and run focused checks for style selection, i18n parity, storage fallback, and build safety.
- `agent/role-prompt/reviewer-role.md`: final review before marking this instruction complete.

## Subagent Execution Protocol

Top owns orchestration. Worker owns implementation. Specialty agents own focused review and must not expand scope.

When subagents are available, dispatch the work in this order:

1. **UI Designer**: review the intended pixel visual direction, toolbar ergonomics, responsive risks, accessibility, and no-overlap constraints. Output must be actionable UI constraints, not code.
2. **Pattern Contract Guardian**: confirm the implementation plan does not alter pattern, palette, grid-size, count, or MARD 221 contracts. Output PASS/BLOCK with watched files.
3. **Security Reviewer**: confirm the plan uses no remote assets, no upload path, no telemetry, and only stores the interface style id. Output PASS/BLOCK.
4. **Performance Reviewer**: confirm pixel style effects are CSS-only and bounded, especially for `78x78` grid rendering and palette showcase rendering. Output PASS/BLOCK.
5. **QA / Test Engineer**: specify exact tests and verification commands for the new interface style contract. Output required test additions.
6. **Worker**: implement only after the above plan checks are clear. Use TDD: add failing tests first, verify red, implement, verify green.
7. **Reviewer**: perform final implementation review against this instruction, docs, tests, local-only guarantees, and changed files.
8. **Top**: resolve conflicts and decide whether the instruction can be marked complete.

Do not dispatch multiple implementation workers against overlapping frontend files. The default implementation write set is intentionally small and overlapping: `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/i18n.tsx`, `frontend/src/styles.css`, `frontend/src/browser-storage.ts`, `frontend/test/i18n-theme.test.ts`, and the new interface style module.

## Read Order

- `agent/role-prompt/common-protocol.md`
- `agent/role-prompt/role-router.md`
- This instruction
- `README.md`, `FEATURES.md`, `FEATURES_ZH.md`
- `DESIGN.md` and `docs/design-rules.md`
- `docs/architecture.md`, `docs/runtime-and-deployment.md`, and `docs/pattern-processing.md`
- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `frontend/src/themes.tsx`
- `frontend/src/i18n.tsx`
- `frontend/src/browser-storage.ts`
- `frontend/src/main.tsx`
- `frontend/test/i18n-theme.test.ts`
- `local/pixel-ref/` as visual reference only

## Current State

- Fundbeads is a Vite, React, TypeScript, Tailwind CSS v4 single-page app.
- Image processing must stay browser-local.
- Existing color themes are `classic`, `midnight`, `ocean`, `candy`, and `mono`.
- Existing locales are `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, and `es`.
- Runtime preferences use browser `localStorage` only when available.
- `DESIGN.md` owns generated default design tokens. Do not hand-edit `frontend/src/design-theme.generated.css`.
- The product already uses a dense tool-first layout with upload, resolution, language, theme, preview/workspace, grid, and palette or summary sections.
- The app currently includes drag/drop upload, original image preview, active-file reuse for resolution changes, stale async-result guards, and a MARD 221 palette showcase before image upload. Preserve these behaviors.
- The active palette is the built-in static `mard-221` dataset. Do not reintroduce mock-palette language or source URLs.
- Current tests include source-level guards for upload workflow behavior, client-only networking, i18n parity, MARD palette contracts, and theme storage fallback.

## Product Requirement

Add an interface style selector in the top control area.

The supported interface styles are:

- `modern`: the current default Fundbeads UI.
- `pixel`: a pixel-inspired UI style for the same app and workflow.

Pixel mode should feel like a pixel craft workbench:

- crisp rectangular or near-rectangular panels
- thicker high-contrast borders
- pixel-like offset shadows
- checkerboard, pegboard, or tiled background treatment
- compact tool controls
- button hover and active states with small offset motion
- image preview rendered with `image-rendering: pixelated`
- mono or pixel-adjacent typography for headings, badges, controls, coordinates, and counts

Use `local/pixel-ref/` only as a visual reference. Do not copy its business content, authentication/account features, remote scripts, telemetry, remote fonts, routes, uploads, or unrelated product concepts.

## Scope

Expected implementation areas:

- Add an interface style source module, for example `frontend/src/interface-style.tsx`.
- Add a provider in `frontend/src/main.tsx`.
- Apply the active style to `document.documentElement.dataset.uiStyle`.
- Add a top-level selector in `frontend/src/App.tsx`.
- Add localized labels in `frontend/src/i18n.tsx`.
- Add CSS selectors in `frontend/src/styles.css` for `[data-ui-style="pixel"]`.
- Add or update tests in `frontend/test/i18n-theme.test.ts`.
- Update docs or feature lists only if the implementation changes user-visible shipped behavior.

Expected changed files:

- `frontend/src/interface-style.tsx` or equivalent new module.
- `frontend/src/main.tsx`.
- `frontend/src/App.tsx`.
- `frontend/src/i18n.tsx`.
- `frontend/src/styles.css`.
- `frontend/test/i18n-theme.test.ts`.
- Optional docs/feature files if the shipped feature is documented in the same pass.

Keep the total changed file count at or below 10. If more files become necessary, stop and split the work into a smaller follow-up instruction.

## Interface Style Contract

Define these contracts explicitly:

- `interfaceStyles` is a source-defined allowlist.
- `InterfaceStyleId` is derived from the allowlist.
- `defaultInterfaceStyle` is `modern`.
- Storage key is stable and namespaced, for example `fundbeads.interfaceStyle`.
- Unknown stored values must fall back without throwing.
- Blocked or unavailable storage must not break the app.
- `InterfaceStyleProvider` exposes `{ interfaceStyle, setInterfaceStyle }`.
- `useInterfaceStyle` throws a clear error if used outside the provider.
- The provider should mirror the current `ThemeProvider` storage and normalization patterns.
- The style selector must not affect generated pattern data, palette matching, summary counts, grid size, object URLs, image decoding, or local-only processing.
- The style selector should use short display labels such as `MD` and `PX` in the toolbar to avoid wrapping in long locales.

## UI Requirements

- Keep the selector in the same top preference cluster as language and color theme.
- Preserve the existing color theme selector. Interface style mode is additive, not a replacement.
- Avoid making the top controls wrap into two rows on normal desktop widths.
- Keep accessible labels for the selector and options.
- Keep keyboard interaction available through the native select or an accessible equivalent.
- Preserve visible focus styles in both `modern` and `pixel`.
- Preserve the default tool-first layout. Do not add a marketing hero.
- Preserve the drag/drop workspace, original image preview, top status row, MARD 221 palette showcase, and color summary.
- Preserve full-grid fit behavior and zoom controls.
- Preserve readable bead-cell codes and all four axes.
- In pixel mode, do not make the `78x78` grid harder to inspect.

## CSS Requirements

- Do not edit `frontend/src/design-theme.generated.css` directly.
- Prefer runtime CSS scoped under `[data-ui-style="pixel"]`.
- Pixel mode may override the existing `--beads-*` semantic variables only for interface presentation. Do not change bead data colors.
- Avoid remote fonts. Use local/system fallbacks such as `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, and CJK system fonts.
- Use CSS-only backgrounds such as small repeating gradients for tiled or pegboard texture.
- Keep effects bounded. Do not add canvas animation, heavy filters, layout polling, or large image assets.
- Avoid broad selectors that accidentally change actual bead cell background colors or generated palette swatches.
- Keep text inside controls from overflowing across all supported locales.
- Prefer low-specificity classes or CSS variable overrides scoped under `[data-ui-style="pixel"]`.
- Pixel shadows may be box-shadow offsets, but they must not shift layout or resize fixed-format grid cells.

## i18n Requirements

Add localized user-facing labels for:

- interface style selector label
- modern style option
- pixel style option

Supported locales:

- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`
- `es`

Keep interpolation placeholder parity intact. Do not localize MARD codes.

Add style label records similar to `themeLabels`, keyed by locale and `InterfaceStyleId`. The visible toolbar may use short labels, but native option labels and accessible labels must remain localized.

## Security and Runtime Boundaries

Forbidden:

- backend routes
- database dependencies
- server-side image processing
- image upload services
- telemetry or analytics
- remote CSS
- remote fonts
- CDN-hosted theme assets
- remote theme configuration
- storing uploaded images or generated patterns in browser storage

The only persistence allowed for this instruction is the chosen interface style id in browser `localStorage`, guarded the same way existing preferences are guarded.

## Pattern Contract Boundaries

This instruction must not change:

- `GridSize` support: `52`, `64`, `78`
- `BeadColor`
- `Pattern`
- `PatternCell`
- `ColorUsage`
- MARD palette codes, labels, RGB values, or group counts
- `mard-221` slug, data shape, or active palette identity
- RGB Euclidean matching logic
- transparent PNG behavior
- color usage aggregation
- total bead count calculation

If any of these change accidentally, revert the change in scope before review.

## Implementation Notes

- Reuse the existing `ThemeProvider` pattern for a separate `InterfaceStyleProvider`.
- Reuse `getLocalStorage` for safe optional storage.
- Keep `I18nProvider`, `ThemeProvider`, and `InterfaceStyleProvider` nesting simple in `frontend/src/main.tsx`.
- Extend `PreferenceSelect` rather than introducing a second selector implementation unless the existing abstraction blocks accessibility.
- Keep the selector display compact. Short labels are acceptable in the visible toolbar when the native option labels remain localized and accessible.
- A suitable icon is `PanelsTopLeft`, `LayoutTemplate`, `MonitorCog`, or another existing `lucide-react` icon that clearly represents interface style.
- Prefer CSS variables for pixel mode shadow and border values, for example:
  - `--pixel-ink`
  - `--pixel-shadow-sm`
  - `--pixel-shadow`
  - `--pixel-shadow-pressed`
- Ensure `img` previews in pixel mode use `image-rendering: pixelated` without affecting bead color swatches.
- If the app already has uncommitted changes, preserve them and merge carefully.

## Required Tests

Add or update tests that prove:

- interface style allowlist is exactly `modern`, `pixel`
- `defaultInterfaceStyle` is `modern`
- valid style ids normalize successfully
- unknown, null, or undefined style values normalize to `null`
- blocked storage does not throw on read or write
- provider/source exports include the stable storage key
- i18n dictionaries include the new message keys for every locale
- style labels exist for every locale and interface style id
- client-only source guard includes the new style module and rejects network or telemetry APIs
- `main.tsx` wraps the app in `InterfaceStyleProvider`
- `App.tsx` applies `document.documentElement.dataset.uiStyle`
- `App.tsx` renders the interface style selector in the top preference cluster
- existing upload workflow source contracts still pass

Do not add brittle tests that depend on exact generated class ordering.

Run the focused test first and verify it fails for the expected missing interface-style contract before implementing production code.

## Manual Verification

Manually verify at minimum:

- top toolbar stays on one row on common desktop widths for all locales
- pixel mode can be selected and persists after reload
- invalid stored interface style falls back to `modern`
- blocked storage still lets the app render
- upload, drag/drop, resolution switching, pattern generation, summary counts, and zoom still work
- `78x78` grid remains usable in both `modern` and `pixel`
- MARD 221 palette showcase remains readable in both `modern` and `pixel`
- no extra network requests are required for the style
- pixel mode visually reflects the `local/pixel-ref` direction without copying unrelated product content

If browser automation is available, capture desktop and mobile screenshots for both interface styles. If browser automation is unavailable, state that clearly in the final report.

## Execution Status

Implementation, documentation alignment, non-E2E verification, and final reviewer checks are complete. E2E/browser verification is deferred by user request.

- Implemented by: Codex Worker
- Reviewed by: Fundbeads Reviewer subagent, PASS
- Date: 2026-07-06
- Implemented files:
  - `frontend/src/interface-style.tsx`
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/i18n.tsx`
  - `frontend/src/styles.css`
  - `frontend/test/i18n-theme.test.ts`
- Documentation alignment files:
  - `README.md`
  - `FEATURES.md`
  - `FEATURES_ZH.md`
  - `docs/architecture.md`
  - `docs/runtime-and-deployment.md`
  - `docs/design-rules.md`
  - `docs/reference-feature-matrix.md`
- Commands passed:
  - `pnpm --dir frontend test:run test/i18n-theme.test.ts`
  - `pnpm test:frontend`
  - `pnpm --dir frontend build`
  - `pnpm design:generate`
  - `pnpm check`
  - `git diff --check`
- Boundary checks passed:
  - No `interfaceStyle`, `uiStyle`, `data-ui-style`, or `fundbeads.interfaceStyle` state introduced into pattern or palette contract files.
  - No network, telemetry, remote CSS, remote font, or CDN usage introduced in `frontend/src/interface-style.tsx` or `frontend/src/styles.css`.
- Browser verification status:
  - Vite dev server runs at `http://localhost:5175/` in the current workspace.
  - E2E/browser verification skipped by user request on 2026-07-06.
  - Prior browser launch attempts were blocked in this environment by macOS sandbox/Mach bootstrap errors and app bundle launch errors.

## Verification Commands

Run:

```sh
pnpm test:frontend
pnpm --dir frontend build
pnpm design:generate
pnpm check
git diff --check
```

If one command fails, fix the issue and rerun the relevant command. If the same command fails twice for the same reason, stop and report the blocker.

## Done When

- Users can switch between `modern` and `pixel` interface styles from the top controls.
- The chosen interface style persists safely when storage is available.
- Storage failures and invalid stored values are handled without breaking render.
- Pixel mode changes UI presentation only and does not change pattern data.
- Tests cover the new preference, i18n labels, storage fallback, and client-only guard.
- Existing upload workflow, MARD 221, theme, and i18n tests still pass.
- Required verification commands pass or documented blockers are reported.
- Docs and feature lists are aligned with the shipped behavior if user-visible documentation is updated.

## Completion

- Completed by: Codex Worker
- Reviewed by: Fundbeads Reviewer subagent, PASS
- Date: 2026-07-06
- Commands:
  - `pnpm --dir frontend test:run test/i18n-theme.test.ts`
  - `pnpm test:frontend`
  - `pnpm --dir frontend build`
  - `pnpm design:generate`
  - `pnpm check`
  - `git diff --check`
- Notes:
  - E2E/browser verification skipped by user request on 2026-07-06.
  - Pixel UI implementation remains scoped to interface presentation and does not alter pattern data, MARD 221 data, grid size support, palette matching, or local-only processing boundaries.

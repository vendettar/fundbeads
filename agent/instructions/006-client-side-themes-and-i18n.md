# 006 Client-Side Themes and i18n

## Goal

Maintain and extend Fundbeads language and theme support without changing the client-only runtime model.

## Current State

- Supported locales: `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`.
- Supported themes: `classic`, `midnight`, `ocean`, `candy`, `mono`.
- UI translations, theme labels, and palette display labels are bundled static source data.
- Language and theme preferences use browser `localStorage` only when available.
- Preference storage is optional; blocked storage must not break the app.

## Scope

- Locale dictionaries and interpolation placeholders.
- Display-only palette labels keyed by MARD code.
- Theme ids, theme labels, and CSS token overrides.
- Preference normalization, fallback, and safe storage access.
- Documentation and tests that keep these contracts explicit.

## Required Checks

- Keep the exact locale and theme allowlists intentional.
- Validate unknown locale and theme values before writing React state.
- Keep MARD codes untranslated.
- Keep palette labels keyed by `BeadColor.code`.
- Preserve placeholder parity across all translated strings.
- Keep theme overrides local to the frontend bundle.
- Preserve sufficient contrast for upload controls, selectors, axes, bead codes, summaries, and errors.
- Keep image processing independent of language and theme state.

## Forbidden

- Do not add remote translation services.
- Do not add remote theme loading.
- Do not add a backend, database, telemetry sink, CDN dependency, or upload service for this scope.
- Do not store uploaded images or generated patterns in browser storage.
- Do not hand-edit `frontend/src/design-theme.generated.css`.
- Do not rename or localize MARD codes.

## Verification

- Run `pnpm design:generate`.
- Run `pnpm check`.
- Keep tests for locale allowlist, theme allowlist, dictionary key parity, placeholder parity, palette label coverage, theme label coverage, storage failure handling, and no-network source guards.

## Done When

- UI copy remains localized for every supported locale.
- Theme selection uses only supported source-defined ids.
- Preferences are safe when storage is available, unavailable, or blocked.
- Docs and feature lists describe current support without implying additional MARD editions or printable export.

# 012 Header Title Contract

## Goal

Keep the app header compact by omitting the main marketing-style title from the top-left control area. The product identity remains available through the app name and browser document title.

## Source Contract

- `frontend/src/App.tsx` does not render a header `<h1>` using a localized `title` key.
- Runtime localization data does not define an unused header `title` message.
- The browser page `<title>` in `index.html` remains unchanged.

## Scope

- Keep the top-left header visually compact.
- Keep spacing balanced after omitting the large title.
- Preserve other translations and UI elements.

## Required Source Shape

- No `<h1>{t("title")}</h1>` header rendering path exists in `frontend/src/App.tsx`.
- No `title` message key exists solely for that removed header.
- Header spacing uses current layout tokens and does not depend on the omitted title.

## Forbidden

- Do not change other translations or UI elements.
- Do not affect the browser page `<title>` tag in `index.html`.

## Verification

- Run `pnpm check` to ensure compiling and unit tests pass.

## Done When

- The header renders without the large title.
- The i18n definition and translation blocks contain no unused header-title key.

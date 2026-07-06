# [COMPLETED] 012 Remove Header Title

## Completion

- **Completed by**: Worker
- **Reviewed by**: Reviewer
- **Commands**: `pnpm check`
- **Date**: 2026-07-06

## Goal

Remove the main app title header ("图片转拼豆图纸" / "Image to Perler Bead Pattern") from the top-left corner of the page and clean up its key from the localization dictionary across all supported languages.

## Current State

- `frontend/src/App.tsx` renders `<h1>{t("title")}</h1>` in the top-left section of the header.
- `frontend/src/i18n.tsx` defines the `title` key in the `Messages` type and translates it across `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, and `es`.

## Scope

- Remove the `<h1>` element rendering the title in `App.tsx`.
- Remove the `title` key definition and all translations from `i18n.tsx`.
- Verify the layout remains clean and tests pass.

## Required Changes

- Delete the line `<h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t("title")}</h1>` from `frontend/src/App.tsx`.
- Clean up margins or classes if needed to keep spacing balanced (e.g. adjust `mt-1` on the subtitle if it is now below the app name).
- Delete the `title: string;` declaration and all its translations from `frontend/src/i18n.tsx`.

## Forbidden

- Do not change other translations or UI elements.
- Do not affect the browser page `<title>` tag in `index.html`.

## Verification

- Run `pnpm check` to ensure compiling and unit tests pass.

## Done When

- The title `<h1>` is removed from the header.
- The `title` key is fully cleaned up from the i18n definition and all translation blocks.

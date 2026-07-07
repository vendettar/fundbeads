# 011 Toolbar Responsive Layout

## Goal

Maintain a responsive top toolbar where the palette button, language selector, theme selector, and interface style selector remain reachable at narrow and desktop viewport widths.

## Layout Contract

- Header contents use a single-column layout on narrow viewports and a two-column grid at `xl`.
- Desktop grid columns allocate remaining space to copy and exact content width to the toolbar.
- The toolbar can scroll horizontally on narrow viewports without clipping the first or last control.
- Interactive controls keep visible focus states and remain keyboard reachable.

## Scope

- Keep the top control area in `frontend/src/App.tsx` aligned under both desktop and mobile viewports.
- Keep the toolbar's overflow behavior horizontal and intentional.
- Preserve existing dropdown, input, selector, i18n, theme, and interface style behavior.

## Required Source Shape

- Header wrapper uses `grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-center`.
- Toolbar scroller uses `no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto p-1 mx-[-4px]`.
- Toolbar scroller does not rely on `xl:justify-end` for alignment.

## Forbidden

- Do not introduce server dependencies or database calls.
- Do not modify files other than `frontend/src/App.tsx` unless necessary for layout safety.
- Do not break existing responsive layout behaviors for dropdowns, inputs, and selectors.

## Verification

- Run `pnpm check` to ensure compile and check tasks pass.
- Verify the layout visually at different viewport widths.

## Done When

- The "MARD 221" palette button is fully visible or can be scrolled to without truncation on narrow screens.
- The "Interface Style" selector is fully visible and not truncated at desktop widths, including a 1280px viewport.

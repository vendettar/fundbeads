# [COMPLETED] 011 Fix Palette Button Truncation

## Completion

- **Completed by**: Worker
- **Reviewed by**: Reviewer
- **Commands**: `pnpm check`
- **Date**: 2026-07-06

## Goal

Fix layout truncation issues on the top toolbar:
1. The left area of the "MARD 221" palette button (specifically, the Palette icon and the left side of the button container) is cut off by the left header/banner when the header elements overflow the screen width under restricted viewports.
2. The right area of the rightmost button ("Interface Style" select dropdown) is cut off under the desktop layout width (1216px content width at `xl` breakpoint) because the toolbar container is allowed to shrink, forcing an overflow when side-by-side with the long title/subtitle.

## Current State

- The buttons and preferences container in `frontend/src/App.tsx` has class names:
  `no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto p-1 mx-[-4px]` (after removing `xl:justify-end`).
- Under the `xl` breakpoint (viewport >= 1280px, layout is `xl:flex-row`), the outer flex container places the title section and the toolbar side-by-side.
- The toolbar wrapper `div` has classes `min-w-0 xl:ml-auto`, which allows it to shrink below its natural width. When the subtitle and toolbar widths combined exceed 1216px, the toolbar shrinks, triggering overflow scrolling and clipping the rightmost select button.

## Scope

- Adjust the layout of the header container in `frontend/src/App.tsx` to prevent flexbox from shrinking the interactive toolbar.
- Use a CSS Grid layout for the header contents under desktop viewports to allocate remaining space to the text title section (`1fr`) and exact content width to the toolbar (`auto`).
- Ensure that the buttons are aligned properly under both desktop and mobile viewports.

## Required Changes

- In `frontend/src/App.tsx`, change the outer flex container class:
  From: `flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between`
  To: `grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-center`
- Keep the `xl:justify-end` class removed from the inner flex container to maintain correct scroll behavior on mobile overflow.

## Forbidden

- Do not introduce server dependencies or database calls.
- Do not modify files other than `frontend/src/App.tsx` unless necessary for layout safety.
- Do not break existing responsive layout behaviors for dropdowns, inputs, and selectors.

## Verification

- Run `pnpm check` to ensure compile and check tasks pass.
- Verify the layout visually at different viewport widths.

## Done When

- The leftmost button "MARD 221" is fully visible or can be scrolled to without truncation on narrow screens.
- The rightmost button ("Interface Style") is fully visible and not truncated at any screen width, including the 1280px viewport (`1216px` content width).

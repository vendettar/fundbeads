# 003 Pattern Grid Reference View

## Goal

Render the generated pattern in a high-contrast grid that supports practical bead placement from a reference-style chart.

## Scope

- Pattern grid UI in `frontend/src/App.tsx` or extracted components if justified.
- Related CSS/Tailwind class usage.
- Manual/browser verification for readability and scroll behavior.

## Required Changes

- Render one visible cell per bead.
- Show the matched MARD color as each cell background.
- Overlay the MARD color code inside each cell.
- Use readable text color against both dark and light bead colors.
- Add numbered X and Y axes on all four borders: top, bottom, left, and right.
- Number axes from `1` through the selected grid size.
- Draw stronger counting lines every 5 or 10 cells.
- Make the grid horizontally scrollable when it is wider than the viewport.

## Forbidden

- Do not render the pattern as an unlabeled image only. Each bead code must remain visible.
- Do not compress 64x64 or 78x78 grids until codes become unreadable.
- Do not remove top, bottom, left, or right axes.
- Do not use decorative wrappers that reduce grid workspace.

## Implementation Notes

- Use stable cell dimensions so hover states, labels, and border weights do not resize the grid.
- Avoid decorative wrappers around the grid; this is the core work surface.
- Prefer CSS classes and inline grid-template sizing over canvas rendering so labels remain inspectable and selectable.
- Axis and cell coordinates are 1-based.
- Major and minor counting lines must be visually distinguishable from base grid lines.

## Verification

- Generate each supported resolution and confirm all four axes reach the final number.
- Confirm cell labels remain legible on black, white, yellow, blue, and red bead colors.
- Confirm every 5th or 10th line is visually stronger than normal grid lines.
- Confirm large grids scroll instead of compressing into unreadable cells.
- Run `pnpm check`.

## Done When

- The grid can be used as a bead-placement chart without relying on the original uploaded image.
- Users can count rows and columns using axes plus 5/10 helper lines.

## Decision Log

Required if rendering moves from DOM to canvas, if axes are removed or changed, or if supported grid sizes change.

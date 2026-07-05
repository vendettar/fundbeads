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
- Fit the full generated chart into the pattern viewport by default.
- Provide zoom controls so users can inspect dense grids without making default scrollbars the primary experience.

## Forbidden

- Do not render the pattern as an unlabeled image only. Each bead code must remain visible.
- Do not make scrollbars the default way to see the whole generated grid.
- Do not remove top, bottom, left, or right axes.
- Do not use decorative wrappers that reduce grid workspace.

## Implementation Notes

- Use stable base cell dimensions and apply viewport fitting or zooming at the grid layer so hover states, labels, and border weights do not resize cells independently.
- Avoid decorative wrappers around the grid; this is the core work surface.
- Prefer CSS classes and inline grid-template sizing over canvas rendering so labels remain inspectable and selectable.
- Axis and cell coordinates are 1-based.
- Major and minor counting lines must be visually distinguishable from base grid lines.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, should zoom only while the pointer is over the pattern grid.

## Verification

- Generate each supported resolution and confirm all four axes reach the final number.
- Confirm cell labels remain legible on black, white, yellow, blue, and red bead colors.
- Confirm every 5th or 10th line is visually stronger than normal grid lines.
- Confirm large grids fit by default without grid scrollbars.
- Confirm zoom controls and Ctrl/Command + wheel enlarge the grid for detail inspection.
- Run `pnpm check`.

## Done When

- The grid can be used as a bead-placement chart without relying on the original uploaded image.
- Users can count rows and columns using axes plus 5/10 helper lines.
- Users see the whole generated chart first, then zoom for details when needed.

## Decision Log

Required if rendering moves from DOM to canvas, if axes are removed or changed, or if supported grid sizes change.

# Design Rules

This document guides Fundbeads frontend work. The app is a craft production tool, not a marketing site.

## Token Source

`DESIGN.md` is the source for default theme tokens.

When changing theme tokens:

1. Update `DESIGN.md`.
2. Run `pnpm design:generate`.
3. Review `frontend/src/design-theme.generated.css`.

Do not edit `frontend/src/design-theme.generated.css` directly.

## Product Layout

- The first screen should be the usable tool.
- Upload, resolution selection, processing status, and errors stay near the top.
- The pattern grid is the main workspace.
- The color summary follows the generated grid.
- Avoid decorative layout that reduces the usable grid area.

## Grid Rules

- Render one visible cell per bead.
- Cell background is the matched bead color.
- Cell text is the MARD code.
- Cell dimensions must stay stable.
- Top, bottom, left, and right axes must be visible.
- Axis labels run from `1` through the selected grid size.
- Every 5th or 10th grid line should be stronger than a normal grid line.
- Generated grids should default to a fit-to-screen view so the full chart is visible without grid scrollbars.
- Users can zoom in for detail. Once zoomed beyond the fit size, internal grid scrolling is acceptable.

## Readability

- Cell labels must remain visible against dark and light bead colors.
- Use `readableTextColor` or an equivalent tested contrast rule for cell code text.
- Verify readability on white, black, yellow, red, blue, and saturated dark colors when changing grid styling.
- Keep summary rows compact and scannable.

## Controls

- Use visible text or icon-plus-text controls for primary actions.
- Resolution selection should behave like a segmented control.
- Pattern zoom controls should use icon buttons and expose accessible labels.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, should zoom only while the pointer is over the pattern grid.
- Processing and error states must be visible without shifting the whole page.
- Unsupported file errors should be direct and recoverable.

## Tailwind Usage

- Use semantic Tailwind tokens from `frontend/src/styles.css`, such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-primary`.
- Use `font-mono` for bead codes, coordinates, and counts.
- Keep arbitrary one-off colors out of JSX unless the color is actual bead data from the palette.

## Accessibility

- File upload must be keyboard reachable through its visible label/control.
- Buttons must have readable text or accessible labels.
- Focus states must remain visible.
- Error text must be visible near the control that caused it.
- Grid zoom and scroll containers should not trap keyboard navigation.

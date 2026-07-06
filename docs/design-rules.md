# Design Rules

This document guides Fundbeads frontend work. The app is a craft production tool, not a marketing site.

## Token Source

`DESIGN.md` is the source for default Classic theme tokens.

When changing theme tokens:

1. Update `DESIGN.md`.
2. Run `pnpm design:generate`.
3. Review `frontend/src/design-theme.generated.css`.

Do not edit `frontend/src/design-theme.generated.css` directly.

Named runtime themes live in normal application CSS as overrides for the same `--beads-*` variables. Interface style modes live in normal application CSS scoped under `data-ui-style`. They must not require remote CSS, remote assets, or changes to the generated file.

## Product Layout

- The first screen should be the usable tool.
- Upload, longest-edge pattern controls, and errors stay near the top or main workspace rail.
- The left workspace toolbar is reserved for generation parameters: pattern size, color matching, smoothing, and max color count.
- Language, theme, and interface style selectors stay near the upload and resolution controls.
- MARD palette details open from the top action bar as a modal layer, not as homepage filler below the tool.
- The pattern grid is the main workspace.
- Manual pattern editing controls belong to the generated pattern grid area, not the left generation-parameter toolbar.
- The empty upload workspace should adapt to remaining viewport height so the toolbar and upload canvas fill the first screen without leaving a large blank band below.
- The compact color and bead-count summary sits below the original-image rail when a pattern is active.
- The detailed color usage list follows the generated grid.
- Avoid decorative layout that reduces the usable grid area.

## Grid Rules

- Render one visible cell per bead.
- Cell background is the matched bead color.
- Cell text is the MARD code.
- Cell dimensions must stay stable.
- Top, bottom, left, and right axes must be visible.
- Top and bottom axis labels run from `1` through selected width.
- Left and right axis labels run from `1` through selected height.
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
- Longest-edge pattern presets should behave like a segmented control.
- The longest-edge slider should be keyboard operable, bounded, and paired with precise stepper controls.
- Color distance and dither modes should use compact segmented controls in the left toolbar.
- The max color count control should be a bounded draggable slider with stepper controls, minimum `2`, maximum `64`, default `24`.
- The smoothing control should be keyboard operable, bounded, and paired with precise stepper controls.
- The resolved output dimensions should stay visible in generated pattern context, such as the grid header or summary.
- Pattern zoom controls should use icon buttons and expose accessible labels.
- Pattern editing controls should stay compact in the grid header, expose accessible labels, and show active tool state.
- Pattern grid editing must be keyboard reachable through a single board focus target; arrow keys move the active cell, and Enter or Space applies the active edit tool when applicable.
- Paint, pick, erase, replace, undo, redo, reset, and active-color controls should not hide the first row, axes, zoom controls, or cell labels at the default fit view.
- The active color selector and replace controls may list MARD colors, but they commit stable MARD codes and do not translate those codes.
- Ctrl + mouse wheel, or Command + mouse wheel on macOS, should zoom only while the pointer is over the pattern grid.
- Error states must be visible without shifting the whole page.
- Image processing status must be visible while work is in progress, use localized text, and expose status semantics such as `role="status"`, `aria-live`, or `aria-busy` where appropriate.
- Unsupported file errors should be direct and recoverable.
- Language, theme, and interface style controls should use source-defined allowlists.
- Unsupported stored preferences should fall back without throwing.

## Internationalization

- All user-facing UI copy should go through the i18n dictionary.
- Supported locales are `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, and `es`.
- Keep interpolation placeholders aligned across locales.
- Do not localize MARD codes; color codes remain the stable craft identity.
- Palette labels may be localized as display-only text keyed by MARD code.
- Do not load translations from remote services.

## Tailwind Usage

- Use semantic Tailwind tokens from `frontend/src/styles.css`, such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-primary`.
- Use `font-mono` for bead codes, coordinates, and counts.
- Keep arbitrary one-off colors out of JSX unless the color is actual bead data from the palette.
- Do not add arbitrary typography utilities such as `text-[11px]` in JSX. Define repeated micro text sizes as named classes or Tailwind v4 theme tokens in `frontend/src/styles.css`.
- Fixed-format grid dimensions, such as bead cells and axis cells, should be named component classes in CSS rather than repeated arbitrary JSX utilities.
- Inline styles are acceptable for runtime bead colors, dynamic grid scale/dimensions, and portal placement; otherwise prefer Tailwind utilities or named CSS classes.
- Runtime theme and interface style overrides must preserve contrast for form controls, axes, summary text, and error states.

## Accessibility

- File upload must be keyboard reachable through its visible label/control.
- Buttons must have readable text or accessible labels.
- Focus states must remain visible.
- Error text must be visible near the control that caused it.
- Grid zoom and scroll containers should not trap keyboard navigation.
- The editable pattern grid should expose grid semantics, a stable active cell, and concise keyboard instructions for assistive technology.

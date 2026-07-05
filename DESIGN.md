---
version: alpha
name: Fundbeads
description: Client-side Perler Bead pattern maker with dense labeled grids, craft-workbench controls, and high contrast counting aids.
colors:
  background: "#f7f4ec"
  foreground: "#211f1a"
  card: "#fffdf7"
  card-foreground: "#211f1a"
  muted: "#ebe4d3"
  muted-foreground: "#6c6658"
  border: "#cfc5ac"
  primary: "#167c7a"
  primary-foreground: "#ffffff"
  secondary: "#f0b429"
  secondary-foreground: "#221a02"
  destructive: "#b23a48"
  destructive-foreground: "#ffffff"
  accent: "#d95f3d"
  accent-foreground: "#ffffff"
  ring: "rgb(22 124 122 / 0.35)"
typography:
  body:
    fontFamily: Avenir Next
    fontSize: 1rem
    lineHeight: 1.5
  ui-sm:
    fontFamily: Avenir Next
    fontSize: 0.875rem
    lineHeight: 1.25rem
  code:
    fontFamily: SFMono-Regular
    fontSize: 0.875rem
    lineHeight: 1.5rem
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  pattern-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: 10px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
    padding: 10px
  resolution-selector:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: 4px
  pattern-cell:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.sm}"
    padding: 0px
  summary-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: 8px
---

## Overview

Fundbeads is a focused craft utility for converting image pixels into bead-placement instructions. The interface should feel precise, bright, and practical: closer to a studio workbench than a marketing page.

The first screen should be the tool itself. Users need to upload an image, choose a grid size, inspect the generated chart, and read bead counts without navigating through a landing page.

## UI Direction

- Use dense, readable tool surfaces for repeated craft work.
- Keep the pattern grid dominant and scrollable.
- Prefer crisp borders, stable dimensions, and reliable controls over decorative panels.
- Use strong contrast for axes, every-cell labels, and major counting lines.
- Keep future export or print controls near the pattern surface when those features are added.

## Colors

The palette uses warm paper-like surfaces, teal primary controls, amber secondary states, and red-orange accent/destructive states. The UI should not become a one-hue theme; bead colors already introduce many hues inside the grid.

- **Background** is the page canvas.
- **Card** is for tool panels, grid containers, and summaries.
- **Primary** is the main action color, currently upload and processing emphasis.
- **Secondary** is used for selected resolution state.
- **Accent** is reserved for highlights and future non-destructive emphasis.
- **Destructive** is for validation or irreversible actions.

## Typography

Use the sans family for labels, buttons, headings, and explanatory copy. Use the mono family for bead codes, axis numbers, counts, and generated pattern data.

Avoid oversized headings inside compact tool surfaces. The grid is the visual center, not the page title.

## Layout

The upload and resolution controls stay at the top. The generated pattern grid is the primary workspace and should receive most of the viewport width. Summary statistics follow the grid so users can inspect the chart before reading bead totals.

The pattern grid should scroll horizontally when needed. Do not shrink cells below readable code size just to fit the viewport.

## Grid Rules

Pattern cells must keep stable dimensions. Axis labels appear on all four sides. Every 5th and 10th line should be stronger than the base grid to support counting.

Each cell must show the matched MARD code. If a bead color is very light or very dark, text color must adapt for readability.

## Components

Buttons should use semantic Tailwind classes such as `bg-primary text-primary-foreground` or `bg-secondary text-secondary-foreground`.

Panels and summaries should use `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border`. Hardcoded colors in JSX should be limited to actual bead colors from the palette.

## Do's and Don'ts

Do keep the UI compact, readable, and tool-first. Do use generated design tokens. Do preserve contrast for bead codes and axes.

Do not hand-edit `frontend/src/design-theme.generated.css`. Do not add marketing hero layouts before the working tool. Do not introduce decorative wrappers that make the grid harder to use.

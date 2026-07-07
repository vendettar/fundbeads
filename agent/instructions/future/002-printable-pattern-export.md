# 002 Printable Pattern Export

## Status

Backlog. Not approved for implementation until selected.

## Goal

Add paginated printable output for generated bead patterns while preserving local-only image handling and exact pattern/count contracts. Single-page browser-local PNG and PDF export already exists; this instruction is only for booklet-style print layouts, metadata panels, summary pages, or richer printable formats.

## Scope

- Export format decision: browser print view, paginated PDF/booklet, structured HTML print CSS, SVG, or a combination.
- Pattern export data contract for `Pattern`, `PatternCell`, and `ColorUsage`.
- Printable layout for grid axes, bead codes, counting lines, pagination, metadata, and color summary.
- Browser-only generation with no upload or server processing.

## Required Decisions

- Primary export format and browser support target.
- Whether exported files include original filename, timestamp, palette version, or output-dimension metadata.
- Pagination strategy for large aspect-ratio patterns, including current presets and custom longest-edge values.
- Color and code readability requirements in print.
- Whether printable output reuses current canvas export geometry, DOM preview geometry, SVG, or structured HTML print CSS.

## Acceptance Criteria

- Paginated output preserves 1-based axes on all four sides.
- Exported cells show bead color and MARD code.
- Every 5th or 10th counting line remains visible.
- Summary includes swatch, MARD code, label, count, output dimensions, used colors, and total beads.
- The sum of exported color counts equals `Pattern.totalBeads`.
- No image or generated pattern is uploaded to a server.

## Required Tests

- Unit tests for any export data mapper.
- Browser/manual print verification for current longest-edge presets and high-end custom dimensions.
- Security review for exported filename/metadata and local-only guarantees.
- Regression tests that exported summaries match pattern summaries.

## Verification Commands

```sh
pnpm design:generate
pnpm check
```

## Decision Log

Required.

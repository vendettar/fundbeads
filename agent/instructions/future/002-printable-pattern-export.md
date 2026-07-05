# 002 Printable Pattern Export

## Status

Backlog. Not approved for implementation until selected.

## Goal

Add a client-side printable export for generated bead patterns while preserving local-only image handling and exact pattern/count contracts.

## Scope

- Export format decision: browser print view, PDF-like print stylesheet, PNG/SVG download, or a combination.
- Pattern export data contract for `Pattern`, `PatternCell`, and `ColorUsage`.
- Printable layout for grid axes, bead codes, counting lines, and summary.
- Browser-only generation with no upload or server processing.

## Required Decisions

- Primary export format and browser support target.
- Whether exported files include original filename, timestamp, palette version, or grid size metadata.
- Pagination strategy for 64x64 and 78x78 patterns.
- Color and code readability requirements in print.
- Whether export is generated from DOM, canvas, SVG, or structured HTML print CSS.

## Acceptance Criteria

- Exported pattern preserves 1-based axes on all four sides.
- Exported cells show bead color and MARD code.
- Every 5th or 10th counting line remains visible.
- Summary includes swatch, MARD code, label, count, grid size, used colors, and total beads.
- The sum of exported color counts equals `Pattern.totalBeads`.
- No image or generated pattern is uploaded to a server.

## Required Tests

- Unit tests for any export data mapper.
- Browser/manual print verification for 52x52, 64x64, and 78x78.
- Security review for exported filename/metadata and local-only guarantees.
- Regression tests that exported summaries match pattern summaries.

## Verification Commands

```sh
pnpm design:generate
pnpm check
```

## Decision Log

Required.

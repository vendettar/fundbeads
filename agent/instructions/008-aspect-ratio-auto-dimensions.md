# 008 Aspect Ratio Auto Dimensions [COMPLETED]

## Goal

Fix image-to-pattern sampling so uploaded images are not distorted when their aspect ratio differs from the current default square presets.

This instruction implements the simpler Mode C:

- The user chooses the longest output edge.
- Fundbeads reads the uploaded image aspect ratio.
- Fundbeads automatically calculates the other pattern dimension.
- The generated pattern uses the full image without cropping and without non-proportional stretching.

Example:

- Source image: `16:9`
- Longest edge: `80`
- Output pattern: `80x45`

Do not implement zoom, drag-to-frame, fixed-square crop, crop-position buttons, or manual viewport selection in this instruction. Those belong to the future fixed-dimension crop/viewport instruction.

## Role Team

Use the Fundbeads role prompts before implementation. If subagents are available, use them for focused review; otherwise perform these checks in the main implementation report.

- `agent/role-prompt/top-role.md`: confirm this changes the pattern-dimension workflow and pattern-processing contract.
- `agent/role-prompt/pattern-contract-role.md`: verify `PatternDimensions`, `PatternCell`, `Pattern`, `ColorUsage`, row-major coordinates, and totals stay aligned.
- `agent/role-prompt/ui-designer-role.md`: own the left toolbar behavior, labels, responsive layout, and no-overlap checks.
- `agent/role-prompt/performance-role.md`: review reprocessing, canvas draw cost, and `100x100` bounds.
- `agent/role-prompt/qa-role.md`: define tests for aspect-ratio dimension calculation, image cases, and regressions.
- `agent/role-prompt/security-role.md`: verify the feature remains browser-local with no upload, telemetry, remote image processing, or new dependency.
- `agent/role-prompt/documentation-steward-role.md`: update steady-state docs after implementation.
- `agent/role-prompt/reviewer-role.md`: final implementation review before completion.

## Read Order

- `agent/role-prompt/common-protocol.md`
- `agent/role-prompt/role-router.md`
- This instruction
- `docs/pattern-processing.md`
- `docs/design-rules.md`
- `docs/architecture.md`
- `README.md`, `FEATURES.md`, `FEATURES_ZH.md`
- `frontend/src/pattern.ts`
- `frontend/src/App.tsx`
- `frontend/src/i18n.tsx`
- `frontend/src/styles.css`
- `frontend/test/pattern.test.ts`
- `frontend/test/i18n-theme.test.ts`

## Current Problem

Current image sampling allows square presets such as `80x80`-like dimensions. A `16:9` image forced into a square output gets compressed horizontally, so people and objects are visibly deformed.

For the first fix, Fundbeads should not ask the user to crop. Instead, it should preserve the full image and generate a pattern whose dimensions match the image ratio within the allowed output bounds.

## Product Requirement

Implement aspect-ratio auto dimensions:

- The user controls a single longest-edge value.
- The longest edge is bounded to `40..100`.
- After image upload, the other dimension is calculated from the image aspect ratio.
- The full source image is sampled into the calculated dimensions.
- The source image must not be cropped.
- The source image must not be squeezed into a different aspect ratio.
- Existing square presets can remain as quick longest-edge choices: `52`, `64`, and `78`.
- Width and height should become derived values after an image is active.
- Before an image is active, the toolbar may show the current square default or a longest-edge setting.
- Reprocessing after changing longest edge must reuse the active file and preserve the original preview object URL.

## Canonical Dimension Calculation

Define a pure helper in `frontend/src/pattern.ts`, for example:

```ts
type SourceImageSize = {
  width: number;
  height: number;
};

function dimensionsForAspectRatio(source: SourceImageSize, longestEdge: number): PatternDimensions;
```

Rules:

1. Normalize `longestEdge` to integer `40..100`.
2. If `source.width >= source.height`, output width equals `longestEdge`.
3. If `source.height > source.width`, output height equals `longestEdge`.
4. Calculate the other dimension by preserving source aspect ratio and rounding to the nearest integer.
5. Clamp the calculated dimension to `40..100`.
6. If clamping the calculated dimension would break aspect ratio because the image is extremely wide or tall, keep the longest edge at the requested value and accept that the shorter edge is clamped to `40`. This keeps the existing minimum output constraint explicit.
7. For invalid source dimensions, fall back to a square `{ width: longestEdge, height: longestEdge }`.

Examples:

- `3840x2160`, longest `80` -> `80x45`
- `2160x3840`, longest `80` -> `45x80`
- `3000x3000`, longest `80` -> `80x80`
- `1600x1000`, longest `80` -> `80x50`
- `1000x1600`, longest `80` -> `50x80`

## Sampling Contract

`imageFileToPattern` should use the calculated `PatternDimensions` and may continue to draw the full bitmap into the target canvas:

```ts
context.drawImage(bitmap, 0, 0, width, height);
```

This is acceptable for Mode C because `width` and `height` match the source aspect ratio after calculation. Do not add crop source rectangles in this instruction.

## UI Requirements

Adjust the left workspace toolbar:

- Replace independent width/height sliders with a single longest-edge control after this instruction is implemented.
- Keep square preset buttons `52`, `64`, and `78` as quick longest-edge choices.
- Show the resolved output dimensions clearly, for example `80x45`.
- Provide a stepper and slider for longest edge, bounded `40..100`.
- Use localized labels.
- Keep focus states visible.
- Keep controls the same visual density as the current toolbar.
- Do not add drag/zoom/crop UI in this instruction.

Recommended labels:

- `图纸最长边`
- `输出尺寸`

## State and Processing Requirements

- Store `longestEdge` in `App.tsx` state.
- Store the decoded/source image size when an image is uploaded, or preserve enough metadata to derive dimensions before reprocessing.
- Derive `patternDimensions` from source image size plus `longestEdge` after upload.
- Preserve active file reference and stale async-result guard.
- Reprocess when longest edge changes with `{ refreshPreview: false }`.
- Debounce/coalesce slider changes as in the current dimension controls.
- Do not store longest edge or source image size in localStorage in this instruction.
- Do not change MARD 221 palette data, local color-distance matching behavior, dither behavior, alpha-over-white compositing, count sorting, or row-major cell coordinates.
- Do not add backend services, uploads, telemetry, remote image processing, or third-party image libraries.

## Image Case Matrix

Implementation and review must discuss these cases explicitly:

| Source Image | Longest Edge | Expected Output | Notes |
| --- | ---: | --- | --- |
| `16:9` landscape, such as 4K `3840x2160` | `80` | `80x45` | Full image is used; no crop and no distortion. |
| `9:16` portrait | `80` | `45x80` | Full image is used; no crop and no distortion. |
| `1:1` square | `80` | `80x80` | Same as current square behavior. |
| `3:2` landscape | `90` | `90x60` | Width is the longest edge. |
| `2:3` portrait | `90` | `60x90` | Height is the longest edge. |
| Very wide panorama | `100` | `100x40` after min clamp if needed | Short edge may clamp at `40`; document the min-bound tradeoff. |
| Very tall image | `100` | `40x100` after min clamp if needed | Short edge may clamp at `40`; document the min-bound tradeoff. |
| Transparent PNG | Any | Ratio-derived dimensions | Existing alpha-over-white behavior remains unchanged. |
| Very small image | Any | Ratio-derived dimensions | Browser upscales proportionally into bounded output cells. |
| Very large image | `100` | Max bounded by `100x100` area contract | Decode locally and sample bounded output cells. |
| Invalid or unavailable source dimensions | `80` | `80x80` fallback | Must not crash the app. |

## Required Tests

Use TDD. Add failing tests before implementation and verify they fail for the expected reason.

Required `frontend/test/pattern.test.ts` coverage:

- `dimensionsForAspectRatio({ width: 3840, height: 2160 }, 80)` returns `{ width: 80, height: 45 }`.
- `dimensionsForAspectRatio({ width: 2160, height: 3840 }, 80)` returns `{ width: 45, height: 80 }`.
- Square source returns square output.
- `3:2`, `2:3`, very wide, and very tall cases respect `40..100`.
- Invalid source dimensions fall back to square longest-edge dimensions.
- `imageFileToPattern` continues to generate row-major cells using the resolved dimensions.
- Total beads equal `width * height`.
- Transparent PNG alpha-over-white tests still pass.

Required `frontend/test/i18n-theme.test.ts` or equivalent source tests:

- Toolbar exposes one longest-edge control instead of independent width/height sliders.
- Presets set longest edge values `52`, `64`, and `78`.
- UI displays resolved output dimensions.
- Reprocessing on longest-edge change uses `refreshPreview: false`.
- i18n dictionaries include new longest-edge and output-dimensions labels across all supported locales.
- No network, upload service, telemetry, remote image processing, or CDN dependency is introduced.

## Documentation Updates

After implementation, update steady-state docs:

- `docs/pattern-processing.md`: describe aspect-ratio-derived dimensions and full-image sampling.
- `docs/architecture.md`: update data flow to include source image dimensions and derived pattern dimensions.
- `docs/reference-feature-matrix.md`: update image pixelation status and risks.
- `docs/design-rules.md`: update dimension-control rules.
- `README.md`, `FEATURES.md`, and `FEATURES_ZH.md`: mention longest-edge output and ratio preservation.

Do not describe this as planned work after it ships.

## Verification Commands

Run only non-E2E verification unless the user explicitly asks for browser/E2E checks.

```sh
pnpm --dir frontend test:run test/pattern.test.ts test/i18n-theme.test.ts
pnpm test:frontend
pnpm build:frontend
pnpm check
git diff --check
```

Also run focused negative searches:

```sh
rg -n "fetch\\s*\\(|XMLHttpRequest|sendBeacon|https?://|telemetry|cdn" frontend/src frontend/test
```

## Done When

- A `16:9` image with longest edge `80` generates an `80x45` pattern.
- A `9:16` image with longest edge `80` generates a `45x80` pattern.
- Square images still generate square patterns.
- The app uses the full image without crop controls or viewport dragging.
- Generated patterns keep row-major cells, MARD 221 matching, alpha-over-white compositing, and accurate counts.
- Tests cover aspect-ratio dimension calculation and totals.
- Current-state docs describe the shipped behavior.

## Completion

- Completed by: Codex Worker
- Reviewed by: Codex Reviewer
- Date: 2026-07-06
- Commands:
  - `pnpm --dir frontend test:run test/pattern.test.ts test/i18n-theme.test.ts`
  - `pnpm test:frontend`
  - `pnpm build:frontend`
  - `pnpm check`
  - `pnpm design:generate`
  - `git diff --check`
  - `rg -n "fetch\\s*\\(|XMLHttpRequest|sendBeacon|https?://|telemetry|cdn" frontend/src frontend/test`
  - Focused legacy dimension-contract negative search over `README.md`, `FEATURES.md`, `FEATURES_ZH.md`, `docs`, `frontend/src`, `frontend/test`, and this instruction.

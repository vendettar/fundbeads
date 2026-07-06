# 003 Fixed-Dimension Crop Viewport

## Status

Backlog candidate. Do not implement until explicitly selected and converted into a current executable instruction.

## Goal

Add an advanced image framing mode for users who want a fixed output pattern size, such as `80x80`, while choosing exactly which part of a wider or taller source image should fill that fixed pattern.

This is Mode A from the product discussion:

- Fixed output dimensions stay fixed.
- Source image keeps its aspect ratio.
- The image can be zoomed and dragged behind a fixed pattern viewport.
- The selected viewport is sampled into the pattern.

## Product Rationale

Mode C, `008 Aspect Ratio Auto Dimensions`, preserves the full image and changes the output dimensions to match the source aspect ratio. That is the simplest first fix.

This future instruction is for users who specifically need a square or otherwise fixed-size pattern, such as a portrait/avatar crop, while still avoiding image distortion.

## Expected Behavior

- User chooses fixed pattern dimensions, for example `80x80`.
- Uploaded image is shown in a framing preview.
- Default placement uses cover-fit center crop.
- User can zoom in/out.
- User can drag the image to choose the sampled area.
- The image must not be stretched non-proportionally.
- The viewport must not expose empty background unless a later product decision explicitly allows background fill.
- Reprocessing should be debounced/coalesced while dragging or zooming.

## Example Cases

| Source Image | Fixed Pattern | Expected Behavior |
| --- | --- | --- |
| `16:9` landscape 4K | `80x80` | Default samples a centered square crop; user can drag left/right to choose another square region. |
| `16:9` landscape with subject on left | `80x80` | User drags image right or shifts viewport left to include the subject. |
| `9:16` portrait | `80x80` | Default samples a centered square crop; user can drag up/down. |
| Square image | `80x80` | No crop needed at base zoom; user can zoom in for detail. |
| Very high-resolution source | `100x100` | Framing remains local and bounded; no remote processing. |

## Likely Implementation Areas

- `frontend/src/pattern.ts`: source crop rectangle helper and 9-argument `drawImage`.
- `frontend/src/App.tsx`: framing state, drag/zoom controls, reprocessing policy.
- `frontend/src/styles.css`: fixed viewport preview styling.
- `frontend/src/i18n.tsx`: localized framing labels.
- `frontend/test/pattern.test.ts`: crop rectangle math and canvas draw arguments.
- `frontend/test/i18n-theme.test.ts`: source contracts for controls and local-only guards.
- Current-state docs after implementation.

## Non-Goals

- Do not replace Mode C unless a later product decision says so.
- Do not add backend image processing.
- Do not add telemetry.
- Do not load remote crop libraries or image assets.

## Open Decisions

- Whether fixed-dimension crop mode is a separate mode selector or an advanced section under the dimension toolbar.
- Whether touch dragging must ship with the first version.
- Whether keyboard nudging is required in the first version.
- Whether background/letterbox fill should ever be allowed.

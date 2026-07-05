# 001 Upload and Resolution Workflow

## Goal

Build the first usable image-input workflow for Fundbeads: users can upload a local JPG/PNG image and choose the target bead-grid resolution.

## Scope

- `frontend/src/App.tsx`
- Browser file input and resolution selection UI.
- Current selected file and grid-size state.
- Error and processing status presentation.

## Required Changes

- Provide a visible upload control for JPG and PNG files.
- Provide a resolution selector with exactly three options: `52x52`, `64x64`, and `78x78`.
- Keep all image handling in the browser; do not add a backend or upload endpoint.
- Show the selected filename and current resolution.
- Show a clear error for unsupported file types or image-processing failure.
- Reprocess the current image when the user changes resolution.
- Keep current image processing latest-wins if multiple user actions happen quickly. If this cannot be guaranteed with the current state model, call it out as follow-up risk.

## Forbidden

- Do not send uploaded files to a server, API, worker endpoint, analytics service, or third-party processor.
- Do not add support for formats beyond JPG and PNG without a separate instruction.
- Do not rely on filename extension alone for validation.

## Implementation Notes

- Keep upload state in the main app shell until the workflow grows enough to justify extraction.
- Use `createImageBitmap` and canvas APIs for local decoding and sampling.
- Preserve a stable place in the UI for processing status and errors so the layout does not jump unexpectedly.

## Verification

- Upload a JPG and confirm the app processes it.
- Upload a PNG and confirm the app processes it.
- Try a non-image file and confirm a readable error appears.
- Switch through `52x52`, `64x64`, and `78x78` after upload and confirm the pattern updates.
- Confirm no network request is made for uploaded image content.
- Run `pnpm check`.

## Done When

- A user can upload a valid image and choose any supported resolution without leaving the page.
- No image data leaves the browser.
- Processing, errors, filename, and active resolution are visible in stable UI locations.

## Decision Log

Waived unless supported file types, processing boundary, or resolution contract changes.

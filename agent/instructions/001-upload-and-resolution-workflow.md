# 001 Upload and Resolution Workflow

## Goal

Build the first usable image-input workflow for Fundbeads: users can upload a local JPG/PNG image and choose the target longest-edge output size.

## Scope

- `frontend/src/App.tsx`
- Browser file input and resolution selection UI.
- Current selected file and output-dimension state.
- Error and processing status presentation.

## Required Changes

- Provide a visible upload control for JPG and PNG files.
- Provide a longest-edge selector with presets `52`, `64`, and `78`, while preserving the current aspect-ratio output-dimension contract.
- Keep all image handling in the browser; do not add a backend or upload endpoint.
- Show the selected filename and current output dimensions.
- Show a clear error for unsupported file types or image-processing failure.
- Reprocess the current image when the user changes the selected longest edge.
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
- Switch through longest-edge presets `52`, `64`, and `78` after upload and confirm the pattern updates with aspect-ratio dimensions.
- Confirm no network request is made for uploaded image content.
- Run `pnpm check`.

## Done When

- A user can upload a valid image and choose any supported longest-edge size without leaving the page.
- No image data leaves the browser.
- Processing, errors, filename, and active output dimensions are visible in stable UI locations.

## Decision Log

Waived unless supported file types, processing boundary, or resolution contract changes.

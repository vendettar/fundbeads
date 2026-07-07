# 009 IndexedDB Local Pattern Persistence Infrastructure

## Status

Current local persistence contract. This instruction defines the browser-local persistence foundation only. It does not implement user registration, login, backend APIs, server storage, cloud sync, source-image saving, recent history UI, draft UI, or offline library UI.

## Goal

Add a browser-local IndexedDB persistence layer for Fundbeads so future features can save and restore generated bead patterns, drafts, recent history, offline libraries, and export staging data.

This infrastructure must preserve Fundbeads' local-first image-processing model. IndexedDB is a local UX and cache layer, not an authority source for accounts or server-owned records.

Source image persistence is intentionally not shipped by this instruction. Any future source-image blob storage must be explicit, bounded, and covered by a separate approved instruction.

## Role Team

Use the Fundbeads role prompts before implementation. If subagents are available, use them for focused review; otherwise perform the same checks in the main implementation report.

- `agent/role-prompt/top-role.md`: confirm scope, sequencing, and future account-sync boundaries.
- `agent/role-prompt/business-analyst-role.md`: confirm this is infrastructure for planned persistence features, not a hidden feature shipment.
- `agent/role-prompt/pattern-contract-role.md`: own persisted pattern shape, palette/version contracts, cell order, usage counts, and schema behavior.
- `agent/role-prompt/palette-data-role.md`: verify persisted records carry active palette identity and do not freeze outdated MARD data silently.
- `agent/role-prompt/security-role.md`: review browser-local storage, source image privacy boundaries, account-sync boundaries, and no upload guarantees.
- `agent/role-prompt/performance-role.md`: review storage growth, quota handling, pruning, object URL lifecycle, and bounded pattern size cost.
- `agent/role-prompt/platform-role.md`: verify static deployment remains unchanged and no backend/database/runtime secret boundary is introduced.
- `agent/role-prompt/qa-role.md`: define tests for schema normalization, blocked IndexedDB, quota behavior, old schema invalidation, and no-network guards.
- `agent/role-prompt/documentation-steward-role.md`: update steady-state docs only for infrastructure that actually ships.
- `agent/role-prompt/reviewer-role.md`: final implementation review before completion.

## Read Order

- `agent/role-prompt/common-protocol.md`
- `agent/role-prompt/role-router.md`
- This instruction
- `docs/architecture.md`
- `docs/pattern-processing.md`
- `docs/runtime-and-deployment.md`
- `docs/reference-feature-matrix.md`
- `docs/decision-log.md`
- `README.md`, `FEATURES.md`, `FEATURES_ZH.md`
- `frontend/src/pattern.ts`
- `frontend/src/palette.ts`
- `frontend/src/palettes/mard.ts`
- `frontend/src/browser-storage.ts`
- `frontend/src/App.tsx`
- `frontend/test/pattern.test.ts`
- `frontend/test/i18n-theme.test.ts`
- XImg IndexedDB files as reference only:
  - `/Users/Leo_Qiu/Documents/dev/ximg/ui/src/lib/image-draft-db.ts`
  - `/Users/Leo_Qiu/Documents/dev/ximg/ui/src/components/use-image-draft-persistence.ts`

Do not copy XImg business concepts, API contracts, provider fields, prompt fields, server job recovery, generated-image routes, or account authority semantics. Reference XImg only for local persistence patterns such as schema versioning, normalization, quota handling, pruning, and object URL lifecycle discipline.

## Current State

- Fundbeads is a static Vite, React, TypeScript, Tailwind CSS v4 single-page app.
- Image processing is browser-local.
- There is no backend, server API, database, user account system, upload service, telemetry sink, or remote image processing.
- Preferences use optional browser `localStorage` only for language, theme, and interface style ids.
- Uploaded images, generated patterns, object URLs, and usage counts currently live in React/browser memory only.
- The active palette is the built-in static `mard-221` dataset.
- Supported presets are longest-edge presets `52`, `64`, and `78`; adjustable pattern dimensions are derived from source image aspect ratio, with longest edge bounded to `40..100` and the shorter side allowed below `40` but not below `1`.
- Current pattern generation contracts include:
  - `BeadColor`
  - `Pattern`
  - `PatternCell`
  - `ColorUsage`
  - pattern width and height
  - row-major cell order
  - total bead count
  - color usage count
  - transparent PNG alpha-over-white behavior

## Product Requirement

Introduce IndexedDB infrastructure that can support these upcoming features:

- Recent generated pattern history.
- Refresh/reopen recovery for the last generated pattern.
- Saved drafts.
- Offline pattern library.
- Export staging cache for multiple generated patterns.
- User-explicit saving of generated pattern data.
- Future logged-in account sync where local records can be associated with user-owned remote records.

This instruction should create the persistence foundation and minimal contract tests. It should not add a full user-visible history library unless that is explicitly selected in a later instruction.

## Scope

Expected implementation areas:

- Add a local persistence module, for example `frontend/src/local-pattern-db.ts`.
- Add focused tests, for example `frontend/test/local-pattern-db.test.ts`.
- Add source-contract tests in an existing suite if needed.
- Add a small dependency such as `dexie` only if the implementation uses it intentionally.
- Add a test helper dependency such as `fake-indexeddb` only if integration tests need a browser-like IndexedDB environment.
- Update docs that define runtime, architecture, feature matrix, and decision log after the infrastructure ships.

Expected changed files:

- `frontend/package.json`
- `pnpm-lock.yaml`
- `frontend/src/local-pattern-db.ts`
- `frontend/test/local-pattern-db.test.ts`
- `frontend/test/i18n-theme.test.ts` or another source guard test if needed
- `docs/architecture.md`
- `docs/runtime-and-deployment.md`
- `docs/reference-feature-matrix.md`
- `docs/decision-log.md`
- Optional `README.md`, `FEATURES.md`, `FEATURES_ZH.md` if user-visible behavior changes

Keep the total changed file count at or below 10. If more files become necessary, stop and split the work into a smaller follow-up instruction.

## Out of Scope

Do not implement these in this instruction:

- User email registration.
- Login/session UI.
- Password handling.
- OAuth or magic-link flow.
- Backend API routes.
- Server-side database.
- Remote sync.
- Cloud storage.
- Team/shared libraries.
- Full history panel UI.
- Full draft manager UI.
- Printable export.
- Automatic source image persistence without explicit user action.

It is acceptable to define fields that make these future capabilities possible. It is not acceptable to ship hidden account or sync behavior.

## IndexedDB Contract

Define an explicit local persistence contract:

- Database name: `fundbeads-pattern-store`.
- Schema version must be source-defined and exported.
- Stored shapes must include a `version` field.
- Unknown or unsupported versions must be ignored or invalidated safely.
- Corrupt records must not break app rendering.
- IndexedDB unavailable or blocked must degrade to memory-only behavior without throwing in user flows.
- Quota errors must not corrupt existing records.
- Local persistence must be optional; the app must still generate patterns without it.
- All public functions must validate and normalize data read from IndexedDB before returning typed values.
- Persistence functions must not call `fetch`, `XMLHttpRequest`, `sendBeacon`, or any remote API.

Recommended exported primitives:

```ts
export const localPatternDbName = "fundbeads-pattern-store";
export const localPatternDbVersion = 1;
export const maxLocalPatternRecords = 100;
export const maxLocalPatternListPageSize = 100;

export type LocalPatternRecord = { ... };

export function canUseLocalPatternDb(): boolean;
export function normalizeLocalPatternRecord(value: unknown): LocalPatternRecord | null;
export function estimateLocalPatternRecordBytes(record: LocalPatternRecord): number;
export async function saveLocalPatternRecord(record: LocalPatternRecordInput): Promise<LocalPatternSaveResult>;
export async function readLocalPatternRecord(id: string): Promise<LocalPatternRecord | null>;
export async function listLocalPatternRecords(options: LocalPatternListOptions): Promise<LocalPatternRecordPage>;
export async function deleteLocalPatternRecord(id: string): Promise<void>;
export async function clearLocalPatternRecords(): Promise<void>;
export async function pruneLocalPatternRecords(): Promise<void>;
```

The final API can differ, but it must cover the same responsibilities with tests.

## Data Model Requirements

Persist pattern data as structured records, not DOM snapshots.

Recommended `LocalPatternRecord` fields:

- `id`: stable local UUID.
- `version`: local record schema version.
- `createdAt`: epoch milliseconds.
- `updatedAt`: epoch milliseconds.
- `title`: optional user-facing title.
- `sourceFileName`: optional original filename.
- `width`: persisted pattern width, normalized to `1..100`, with longest edge at least `40`.
- `height`: persisted pattern height, normalized to `1..100`, with longest edge at least `40`.
- `paletteSlug`: `mard-221`.
- `paletteVersion`: source palette version from `mard221Palette.version`.
- `cellCodes`: row-major array of MARD codes or `null` no-bead entries, length must equal `width * height`.
- `usage`: array of `{ code, count }`, derived from non-null `cellCodes`.
- `totalBeads`: must equal the number of non-null `cellCodes`.
- `usedColorCount`: must equal `usage.length`.
- `previewObjectUrl`: forbidden in persistence. Object URLs are runtime-only.
- `draftState`: optional future field for crop/position/export settings, versioned separately if needed.
- `ownerScope`: `"anonymous-local"` for this instruction.
- `localRecordId`: same as or derived from `id`, reserved for future sync mapping.
- `remoteRecordId`: optional future field; must be absent or `null` until sync exists.
- `syncStatus`: `"local-only"` for this instruction.

This compact local record represents generated and edited effective patterns. No-bead cells are stored as `null`; colored cells store stable MARD codes. Do not persist redundant RGB values for every cell. Reconstruct display colors from the current palette when rendering. Snapshot color storage requires a separate approved decision.

## Source Image Blob Policy

Default behavior:

- Do not store uploaded source images.
- Do not store generated preview object URLs.
- Do not automatically persist image blobs during normal generation.
- Do not include source-image blob references in `LocalPatternRecord`.
- Records that claim a saved source image are invalid for the current local pattern contract.

Explicit-save behavior for future instructions:

- A source image blob may be stored only after the user explicitly chooses to save it.
- A future implementation must define source image metadata separately from the pattern, for example:
  - `id`
  - `patternId`
  - `fileName`
  - `mimeType`
  - `sizeBytes`
  - `createdAt`
  - `blob`
- Allowed MIME types, byte budgets, pruning behavior, deletion semantics, and object URL lifecycle must be specified by that future instruction.

## Future Account and Sync Boundary

This instruction must prepare, but not implement, login-aware persistence.

Future account integration should follow these boundaries:

- Local IndexedDB records are not proof of account ownership.
- Browser-local `ownerScope` is not an authority source for server decisions.
- A future server must validate user identity and record ownership independently.
- Local records may contain `remoteRecordId` only after a future sync API confirms ownership.
- Before login, records remain `anonymous-local`.
- After login, a sync flow may offer to associate local records with the signed-in account.
- Conflict resolution, delete propagation, and remote quota must be separate instructions.
- Do not store auth tokens, passwords, session secrets, or email verification state in this pattern IndexedDB store.

## Storage Limits and Pruning

Define explicit bounds in source:

- Maximum pattern records, recommended starting value: `100`.
- Maximum list page size.
- Maximum source-image bytes and maximum preview thumbnail bytes only if those stores are added by a future instruction.

Pruning behavior:

- Pattern records should prune oldest records first when exceeding count limits.
- Quota errors should attempt safe pruning and retry once.
- If retry fails, return a typed failure result and keep the app usable.
- Never silently delete a user-pinned/saved record unless the contract explicitly allows it.

## Pattern Reconstruction Contract

Reading a local pattern record must validate:

- `width` and `height` are supported.
- `cellCodes.length === width * height`.
- Every code exists in the active palette.
- `usage` counts are positive integers.
- `usage` sum equals `totalBeads`.
- `totalBeads` equals the number of non-null `cellCodes`.
- `usedColorCount === usage.length`.
- `paletteSlug === "mard-221"` for this implementation.
- `paletteVersion` is compatible with the active `mard221Palette.version`.

If a record fails validation:

- Do not render it as a valid pattern.
- Return `null` or a typed invalid result.
- Prefer preserving the raw record only if a future repair UI exists; otherwise ignore it safely.

## Security and Privacy Requirements

- No backend.
- No server upload.
- No telemetry.
- No remote storage.
- No remote fonts, CSS, or scripts.
- No storing auth/session secrets in IndexedDB.
- No automatic source image blob persistence.
- No object URL persistence.
- No public/private account authority derived from IndexedDB.
- No logging source image names, pattern contents, or blob metadata to remote services.

Docs and UI copy must be precise: "saved locally in this browser" is acceptable; "saved to your account" is not until account sync exists.

## Performance Requirements

- Persist compact pattern records, not thousands of full color objects.
- Avoid writing to IndexedDB on every render.
- Coalesce or debounce draft writes if future UI writes frequently.
- Do not block pattern generation on persistence success.
- Keep local persistence failures non-fatal.
- Listing history must be paginated.
- Future blob reads must be lazy; do not add source image blob loading to metadata listing in this instruction.
- Future object URLs from stored blobs must be tracked and revoked.
- Bounded patterns up to `100x100` must remain responsive when saved, listed, loaded, and reconstructed.

## UI Requirements

This instruction should not add a full history UI by default.

Allowed minimal UI, only if needed to verify infrastructure:

- A small internal call path that saves the current generated pattern behind an explicit button or developer-only control.
- A non-prominent "restore last local pattern" experiment only if the user explicitly approves it before coding.

Preferred first implementation:

- Build and test the storage module without exposing new user-facing storage controls.
- Update docs to say IndexedDB infrastructure exists but no full local library UI is shipped yet.

## Implementation Notes

- Prefer Dexie if the implementation needs IndexedDB schema management and typed tables; keep the dependency scoped to `frontend`.
- If using native IndexedDB instead, provide equivalent tests for open, upgrade, read, write, list, delete, and blocked/unavailable behavior.
- Keep store names stable and documented.
- Use pure normalizer helpers for stored data so most contract tests do not need a browser IndexedDB runtime.
- Keep all local persistence code isolated from `pattern.ts` matching logic.
- Convert between an effective `Pattern` and `LocalPatternRecordInput` in a mapper function rather than spreading UI state directly into storage.
- Keep storage functions latest-wins friendly; autosave must not resurrect outdated pattern state.
- Do not change `imageFileToPattern`, MARD matching, usage summarization, grid rendering, zoom, i18n, theme, or interface style behavior unless directly required by tests.

## Required Tests

Use TDD. Add failing tests before implementation and verify they fail for the expected reason.

Required unit tests:

- Exports database name, schema version, and storage limit constants.
- Normalizes a valid compact `LocalPatternRecord`.
- Rejects unsupported schema versions.
- Rejects unsupported width or height values.
- Rejects records whose `cellCodes.length` does not equal `width * height`.
- Rejects unknown MARD codes.
- Rejects usage totals that do not match `totalBeads`.
- Rejects records with incompatible palette slug/version.
- Converts a valid `Pattern` to a compact local record input.
- Reconstructs a `Pattern` from a valid local record using active palette colors.
- Does not persist object URLs.
- Does not require source image blobs for normal pattern records.
- Rejects records that claim source image blob references under the current local pattern contract.
- Safe storage functions degrade when IndexedDB is unavailable.

Required integration tests if an IndexedDB test runtime is added:

- Save and read a record.
- List records newest-first with pagination.
- Delete a record.
- Clear all records.
- Prune oldest records beyond `maxLocalPatternRecords`.
- Handle quota failure by returning a typed result or pruning and retrying once.
- Source image blob persistence remains unimplemented and must not appear in shipped local pattern records.

Required source guards:

- `frontend/src/local-pattern-db.ts` must not contain `fetch`, `XMLHttpRequest`, `sendBeacon`, `https://`, `http://`, `telemetry`, or `cdn`.
- No auth/session/token storage is introduced in local pattern persistence.
- No backend route or server API is introduced.

## Documentation Updates

After implementation, update steady-state docs:

- `docs/architecture.md`: show optional IndexedDB local pattern store as browser-local persistence.
- `docs/runtime-and-deployment.md`: explain static deployment remains unchanged and IndexedDB is browser-local.
- `docs/reference-feature-matrix.md`: mark IndexedDB persistence infrastructure as shipped only if implemented; keep history/library/draft UI as planned until built.
- `docs/decision-log.md`: record the local persistence decision, source image blob policy, and future account-sync boundary.
- `README.md`, `FEATURES.md`, and `FEATURES_ZH.md`: update only if there is user-visible behavior beyond infrastructure.

Do not claim recent history, draft UI, offline library, account sync, or source-image saving as shipped until those features exist.

## Verification Commands

Run:

```sh
pnpm test:frontend
pnpm --dir frontend build
pnpm check
pnpm design:generate
git diff --check
```

Run focused negative searches:

```sh
rg -n "fetch\\s*\\(|XMLHttpRequest|sendBeacon|https?://|telemetry|cdn" frontend/src/local-pattern-db.ts frontend/test
rg -n "password|session|token|auth|login|email" frontend/src/local-pattern-db.ts frontend/test
```

If `dexie` or `fake-indexeddb` is added, verify lockfile changes are intentional and only scoped to frontend development/runtime needs.

## Done When

- A typed local IndexedDB persistence module exists.
- Stored pattern records are compact, versioned, bounded, and validated.
- Normal pattern generation still works when IndexedDB is unavailable or blocked.
- Source image blob persistence is left as an explicit future extension.
- Future account sync fields are reserved without implementing login or remote sync.
- Tests cover normalization, pattern conversion, safety guards, and blocked/unavailable storage behavior.
- Docs distinguish shipped persistence infrastructure from future history, draft, offline library, export cache, and account-sync features.
- `pnpm check`, `pnpm design:generate`, and `git diff --check` pass.

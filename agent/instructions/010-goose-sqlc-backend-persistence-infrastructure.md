# 010 Goose and sqlc Backend Persistence Infrastructure

## Status

Drafted for a future implementation task. This instruction defines the backend persistence foundation only. It does not implement email registration, login UI, sessions, image upload APIs, saved-history UI, or account sync.

Before implementation, describe the concrete file-change plan and wait for user approval. If the implementation would touch more than 10 files, split it into smaller tasks first.

## Goal

Introduce a backend persistence foundation for Fundbeads using Go, SQLite, goose migrations, and sqlc-generated query code. The foundation should make future user email login and saved bead-pattern history possible without changing Fundbeads' current browser-local image processing contract.

This is a server-authority persistence layer for future account features. It must remain clearly separate from the browser-local IndexedDB infrastructure introduced by instruction `009`.

## Role Team

Use the Fundbeads role prompts before implementation. If subagents are available, use them for focused implementation and review; otherwise perform the same checks in the main report.

- `agent/role-prompt/top-role.md`: confirm architecture sequencing and avoid shipping hidden product features.
- `agent/role-prompt/business-analyst-role.md`: confirm this is backend infrastructure for planned account/history work, not a complete account product.
- `agent/role-prompt/platform-role.md`: own Go runtime, SQLite path, Docker/deployment changes, scripts, migrations, and rollback notes.
- `agent/role-prompt/security-role.md`: own email identity, token hashing, server authority, image metadata, logging, and secret boundaries.
- `agent/role-prompt/pattern-contract-role.md`: own persisted pattern dimensions, row-major cell codes, usage counts, palette identity, and server validation contracts.
- `agent/role-prompt/palette-data-role.md`: ensure saved records preserve palette slug/version and do not silently drift across MARD palette updates.
- `agent/role-prompt/performance-role.md`: review SQLite concurrency, file storage growth, query indexes, and large pattern/history listing behavior.
- `agent/role-prompt/qa-role.md`: define migration, sqlc, repository, and future API contract tests.
- `agent/role-prompt/documentation-steward-role.md`: update steady-state docs only for backend infrastructure that actually ships.
- `agent/role-prompt/reviewer-role.md`: final implementation review before completion.

Do not introduce a generic DBA role unless a future instruction adds one explicitly. For this instruction, platform, security, performance, and reviewer roles jointly own database infrastructure review.

## Read Order

- `agent/role-prompt/common-protocol.md`
- `agent/role-prompt/role-router.md`
- This instruction
- `agent/instructions/009-indexeddb-local-pattern-persistence-infrastructure.md`
- `docs/architecture.md`
- `docs/pattern-processing.md`
- `docs/runtime-and-deployment.md`
- `docs/reference-feature-matrix.md`
- `docs/decision-log.md`
- `README.md`, `FEATURES.md`, `FEATURES_ZH.md`
- `package.json`, `pnpm-workspace.yaml`, `Dockerfile`, `docker-compose.yml`
- `frontend/src/pattern.ts`
- `frontend/src/palette.ts`
- `frontend/src/palettes/mard.ts`
- XImg references, for infrastructure patterns only:
  - `/Users/Leo_Qiu/Documents/dev/ximg/sqlc.yaml`
  - `/Users/Leo_Qiu/Documents/dev/ximg/internal/db/migrations.go`
  - `/Users/Leo_Qiu/Documents/dev/ximg/internal/db/migrations/*.sql`
  - `/Users/Leo_Qiu/Documents/dev/ximg/docs/runtime-and-deployment.md`
  - `/Users/Leo_Qiu/Documents/dev/ximg/docs/deployment.md`
  - `/Users/Leo_Qiu/Documents/dev/ximg/agent/instruction/028-sqlc-query-domain-split.md`

Reference XImg for goose embedding, sqlc directory layout, generated-code discipline, SQLite runtime notes, and verification style. Do not copy XImg business tables, API key concepts, provider concepts, generated-image semantics, quotas, routes, or cleanup policies.

## Current State

- Fundbeads is currently a static Vite, React, TypeScript, Tailwind CSS v4 single-page app.
- Production Docker currently serves compiled static files with nginx.
- There is no backend service, server API, server-side database, server-side image processing, upload endpoint, email system, account system, or server-side pattern history.
- Browser-local processing remains the active product contract:
  - JPG/PNG image decoding happens in the browser.
  - Pattern generation uses local canvas sampling and local MARD palette matching.
  - Generated patterns use `width`, `height`, row-major cells, usage counts, and total bead counts.
  - IndexedDB can store local compact records when explicitly used, but it is not account authority.
- The active palette is the static `mard-221` source dataset.

## Product Requirement

Prepare backend persistence infrastructure for future features:

- Email-based user registration or login.
- Server-owned saved bead-pattern history.
- Server-owned saved draft metadata.
- Server-owned saved pattern artifacts.
- Optional storage of user-approved source image artifacts.
- Future reconciliation between local IndexedDB records and server-owned account records.

The first implementation should create infrastructure and contracts only. Future user-facing account flows, upload flows, and history UI must be separate instructions.

## Scope

Expected implementation areas when this instruction is executed:

- Add Go module and backend entry point, for example:
  - `go.mod`
  - `go.sum`
  - `cmd/server/main.go`
- Add SQLite database package:
  - `internal/db/migrations.go`
  - `internal/db/migrations/00001_init.sql`
  - `internal/db/schema.sql`
  - `internal/db/queries/*.sql`
  - `internal/db/sqlc/*` generated files
- Add sqlc configuration:
  - `sqlc.yaml`
- Add backend runtime tests:
  - migration test on temporary SQLite database
  - query/repository tests around the initial tables
  - source guard tests for token/image handling if applicable
- Update scripts and deployment files deliberately:
  - root package scripts or a `Makefile`
  - `Dockerfile`
  - `docker-compose.yml`
- Update docs after implementation:
  - `docs/architecture.md`
  - `docs/runtime-and-deployment.md`
  - `docs/reference-feature-matrix.md`
  - `docs/decision-log.md`
  - `README.md`, `FEATURES.md`, `FEATURES_ZH.md` only if user-visible behavior changes

If this list would require more than 10 changed files in a single implementation pass, split the work. A recommended split is:

1. Go module, database package, goose migrations, sqlc config, and tests.
2. Runtime wiring, Docker/deployment, scripts, and docs.
3. Future auth/history API routes and UI, only after separate approval.

## Out of Scope

Do not implement these in this instruction:

- Email registration UI.
- Login UI.
- Password authentication.
- OAuth.
- Magic-link email sending.
- SMTP or transactional email provider integration.
- Session cookies or API auth middleware beyond inert infrastructure stubs.
- User-facing saved-history UI.
- Pattern upload endpoint.
- Automatic upload of source images.
- Cloudflare R2 upload, signed URL, bucket policy, lifecycle policy, or credential integration.
- Account sync between IndexedDB and the server.
- Conflict resolution between local and server records.
- Public sharing links.
- Printable export.

It is acceptable to create minimal database tables and storage-key contracts that make these future capabilities possible. It is not acceptable to ship hidden auth, hidden upload, hidden R2 writes, or hidden sync behavior.

## Backend Runtime Contract

The implementation must make the runtime boundary explicit.

Recommended direction:

- Use a Go backend process as the future production runtime.
- Serve built frontend assets from the Go process or document a deliberate nginx-plus-backend split.
- Keep image processing in the browser. The backend stores metadata and approved artifacts only.
- Keep API routes inert or minimal until later instructions define account/history behavior.

Environment variables:

- `FUNDBEADS_DB_PATH`: path to the SQLite database, recommended local default `local/data/fundbeads.sqlite`.
- `FUNDBEADS_DATA_DIR`: mutable data directory, recommended local default `local/data`.
- `FUNDBEADS_STORAGE_ROOT`: filesystem root for future stored artifacts, recommended local default `local/storage`.
- `FUNDBEADS_STORAGE_BACKEND`: future storage backend selector, initially `local`, later `r2`.
- Future R2 settings, for example bucket name, account id, access key id, and secret access key, must be server-only environment variables.
- Any future cookie/session/email/R2 secrets must be separate server-only environment variables and must never enter Vite client assets.

SQLite runtime requirements:

- Open SQLite with a clear DSN builder.
- Enable `foreign_keys`.
- Use WAL mode for normal runtime if supported.
- Set a practical `busy_timeout`.
- Limit database concurrency deliberately, recommended `SetMaxOpenConns(1)` for SQLite unless tests prove another choice is safe.
- Run embedded goose migrations at startup before serving future API traffic.
- Fail startup clearly if migrations fail.
- Keep DB initialization idempotent.

## Goose Migration Contract

Use goose for schema migrations.

Required conventions:

- Store migrations under `internal/db/migrations/*.sql`.
- Embed migrations in `internal/db/migrations.go`.
- Use `github.com/pressly/goose/v3`.
- Set the goose dialect to `sqlite3`.
- Run migrations with a context-aware function, for example `RunMigrations(ctx, db) error`.
- Every migration must include `-- +goose Up` and `-- +goose Down`.
- Use `-- +goose StatementBegin` and `-- +goose StatementEnd` when a migration has multiple statements.
- Keep `internal/db/schema.sql` aligned with the latest migrated schema for sqlc.
- Do not modify production schema with ad hoc startup SQL outside migrations, except runtime pragmas such as `foreign_keys`, WAL, and `busy_timeout`.

Migration review requirements:

- Migrations must be deterministic.
- Down migrations must be honest. If data loss would occur, document it in the migration and implementation report.
- Foreign keys, uniqueness, checks, and indexes must be defined at the database layer where they protect invariants.
- Generated goose metadata tables are implementation details and should not be used by app code.

## sqlc Contract

Use sqlc for typed query code.

Recommended `sqlc.yaml` shape:

```yaml
version: "2"
sql:
  - engine: "sqlite"
    schema: "internal/db/schema.sql"
    queries: "internal/db/queries"
    gen:
      go:
        package: "sqlc"
        out: "internal/db/sqlc"
        sql_package: "database/sql"
        emit_json_tags: false
        emit_prepared_queries: false
        emit_interface: false
```

Required conventions:

- Keep handwritten SQL queries in `internal/db/queries`.
- Keep generated code in `internal/db/sqlc`.
- Never hand-edit `internal/db/sqlc`.
- Run `sqlc generate` after schema or query changes.
- Review generated diffs before completion.
- Prefer domain-split query files when the query count grows, for example `users.sql`, `email_login_challenges.sql`, `patterns.sql`, and `artifacts.sql`.
- Keep repository/service logic outside generated sqlc packages.

## Initial Data Model Direction

The initial schema should be minimal but migration-safe. Names can change during implementation, but the contracts below must remain covered.

### Users

Purpose: reserve account identity for future email login.

Recommended fields:

- `id`: integer primary key.
- `email`: normalized lowercase email, unique.
- `email_verified_at`: nullable timestamp.
- `created_at`: timestamp.
- `updated_at`: timestamp.
- `disabled_at`: nullable timestamp.
- `deleted_at`: nullable timestamp if soft delete is supported.

Requirements:

- Normalize email before insert.
- Enforce uniqueness at the database layer.
- Do not store passwords unless a future password-auth instruction explicitly approves it.
- Do not treat local IndexedDB owner fields as proof of user identity.

### Email Login Challenges

Purpose: prepare for future email verification or magic-link login without implementing email sending.

Recommended fields:

- `id`: integer primary key.
- `user_id`: nullable or required depending on the selected flow.
- `email`: normalized lowercase email.
- `token_hash`: hash of the login or verification token.
- `purpose`: constrained value such as `login` or `verify_email`.
- `expires_at`: timestamp.
- `consumed_at`: nullable timestamp.
- `created_at`: timestamp.
- `request_ip_hash`: optional, if future abuse controls need it.

Requirements:

- Never store plaintext login tokens.
- Never log plaintext login tokens.
- Never generate or send real email in this instruction.
- Add indexes that support lookup by token hash and expiry cleanup.

### Saved Patterns

Purpose: server-owned saved bead pattern records for future history and drafts.

Recommended fields:

- `id`: integer primary key.
- `user_id`: foreign key to `users.id`.
- `title`: optional user-facing title.
- `width`: pattern width.
- `height`: pattern height.
- `palette_slug`: expected `mard-221` for the current palette.
- `palette_version`: source palette version.
- `cell_codes_json`: compact row-major array of MARD codes as JSON text.
- `usage_json`: compact array of code/count pairs as JSON text.
- `total_beads`: must equal `width * height`.
- `used_color_count`: must equal usage length.
- `source_file_name`: optional original filename, treated as private user data.
- `created_at`: timestamp.
- `updated_at`: timestamp.
- `deleted_at`: nullable timestamp if soft delete is supported.

Requirements:

- Validate `width`, `height`, cell-code count, usage totals, and palette identity before insert/update.
- Store stable MARD codes, not repeated RGB objects per cell.
- Preserve row-major order.
- Do not derive totals from UI text.
- Add an index for user history listing by `user_id` and creation/update time.

### Pattern Artifacts

Purpose: record metadata for future approved source images, preview images, and export files. The long-term image artifact backend is Cloudflare R2. Local filesystem storage may be used only as a development fallback or an intermediate implementation step.

Recommended fields:

- `id`: integer primary key.
- `pattern_id`: foreign key to saved pattern.
- `kind`: constrained value such as `source`, `preview`, or `export`.
- `mime_type`: constrained to approved formats when applicable.
- `size_bytes`: non-negative integer.
- `width`: optional pixel width.
- `height`: optional pixel height.
- `storage_backend`: constrained value such as `local` or `r2`.
- `storage_bucket`: R2 bucket name or local logical bucket.
- `storage_key`: opaque artifact key.
- `local_path`: optional development-only local path when `storage_backend = 'local'`.
- `sha256`: optional content hash.
- `created_at`: timestamp.
- `deleted_at`: nullable timestamp.

Requirements:

- Do not store image bytes in SQLite.
- Store only artifact metadata and an opaque storage key.
- User source images may be stored only after explicit user choice in a future feature.
- Validate ownership through the associated pattern and user before serving any artifact in future APIs.
- Do not expose R2 bucket names, R2 object keys, private filesystem paths, or raw storage credentials in URLs, logs, or client responses.
- Future artifact download or preview APIs must authorize ownership before returning bytes or short-lived signed URLs.

## Pattern Contract Boundary

Server persistence must preserve the effective Fundbeads pattern contract:

- `width` and `height` are authoritative dimensions.
- `totalBeads === width * height`.
- `cellCodes.length === totalBeads`.
- Cell codes are row-major.
- Every cell code must exist in the active or declared palette version.
- `usage` counts are positive integers.
- Sum of usage counts equals `totalBeads`.
- `usedColorCount === usage.length`.
- Palette identity includes both `paletteSlug` and `paletteVersion`.

If the frontend sends pattern data to a future backend, the server must validate these invariants independently. Browser IndexedDB records and client TypeScript types are helpful but are not authority at the server boundary.

## Security Requirements

- Treat email addresses, uploaded filenames, source images, generated patterns, and bead histories as private user data.
- Normalize and validate email addresses before persistence.
- Store token hashes, never plaintext login tokens.
- Do not store passwords without a separate approved password-auth design.
- Do not add API keys, SMTP credentials, cookie secrets, or private paths to client-visible Vite config.
- Do not add R2 credentials, bucket secrets, signed URL secrets, API keys, SMTP credentials, cookie secrets, or private paths to client-visible Vite config.
- Do not log auth tokens, source image contents, pattern cell arrays, private filenames, R2 keys, signed URLs, or storage paths at info level.
- Use server-side ownership checks for all future user records.
- Use database constraints for ownership and uniqueness.
- Do not trust `remoteRecordId`, `ownerScope`, or other IndexedDB fields as authority.
- Do not upload or store source images automatically.
- Keep future artifact serving behind authorization checks.

## Performance Requirements

- Keep saved pattern rows compact.
- Avoid storing one row per bead unless a future query requirement proves it is necessary.
- Add indexes for common future list/detail paths:
  - user by normalized email
  - email challenge by token hash and expiry
  - saved patterns by user and timestamp
  - artifacts by pattern
- Keep pattern-history listing paginated.
- Keep artifact bytes outside SQLite. Future persistent image artifacts should live in R2, with local filesystem storage only for development or explicitly documented transitional deployments.
- Add cleanup strategy hooks for expired email challenges and deleted artifacts, but do not build full background cleanup unless separately requested.
- Verify `78x78` and adjustable-dimension pattern payloads remain practical for JSON storage and listing metadata.

## Deployment and Docker Requirements

Changing from static-only nginx to a backend runtime is an architecture change. Implement it deliberately.

Acceptable directions:

- A single Go server builds or embeds the frontend assets and serves both static files and future API routes.
- A compose setup runs a Go backend plus a static frontend server, with documented ports and network boundaries.

Preferred first backend foundation:

- Single Go server runtime for fewer moving parts, unless there is a clear reason to keep nginx.
- Persist SQLite data under mounted `local/data`. Use `local/storage` only for development artifact storage until the R2-backed artifact implementation ships.
- Keep production defaults safe for local development and explicit for deployment.

Documentation must explain:

- How to create and persist the SQLite file.
- How migrations run.
- How to back up and restore `FUNDBEADS_DB_PATH` and artifact storage.
- How future R2-backed artifacts are configured, backed up, retained, and revoked once R2 integration ships.
- How to roll back a failed deployment.
- Which runtime owns static frontend serving after the backend is introduced.

## Testing Requirements

Use TDD for implementation work. Add failing tests before implementing database behavior.

Required backend tests:

- Migration applies cleanly to an empty temporary SQLite database.
- Migration can run twice without failing.
- `schema.sql` and goose migrations produce compatible sqlc output.
- User insert enforces normalized unique email.
- Email challenge stores token hash only and supports expiry lookup.
- Saved pattern insert rejects invalid dimensions.
- Saved pattern insert rejects mismatched `cell_codes_json` length.
- Saved pattern insert rejects usage totals that do not equal `width * height`.
- Artifact metadata insert rejects unsupported kind or negative byte size.
- Deleting or soft-deleting a user/pattern follows the documented foreign-key behavior.

Required source guards:

- Generated `internal/db/sqlc` files are not hand-edited.
- No plaintext token fixture is persisted outside a test-local variable.
- No image bytes are stored in SQLite schema columns.
- No R2 credentials, signed URLs, bucket names, or object keys are exposed to the Vite client.
- No frontend code starts calling backend APIs unless a later instruction adds API behavior.

## Verification Commands

Run the relevant command set after implementation.

Backend:

```sh
go test ./... -count=1
sqlc generate
git diff --exit-code -- internal/db/sqlc
```

Frontend and existing project gates:

```sh
pnpm design:generate
pnpm check
git diff --check
```

If new root scripts wrap Go/sqlc commands, run those scripts too and document their exact names.

Focused negative searches:

```sh
rg -n "password|plaintext|raw_token|token_value|image.*BLOB|source_image.*BLOB" internal sqlc.yaml
rg -n "R2_|r2_|bucket|storage_key|signed_url|secret_access_key" frontend/src frontend/test
rg -n "fetch\\s*\\(|XMLHttpRequest|sendBeacon" frontend/src
```

Adjust the search paths to the final implementation layout.

## Documentation Updates

After implementation, update steady-state docs to match what actually ships:

- `docs/architecture.md`: describe the new backend runtime and how it relates to browser-local processing and IndexedDB.
- `docs/runtime-and-deployment.md`: document DB path, storage backend mode, R2 planned boundary if not yet implemented, migrations, Docker/runtime model, backup, restore, and rollback.
- `docs/reference-feature-matrix.md`: mark goose/sqlc backend persistence infrastructure as shipped only if implemented; keep email login, history UI, source-image upload, R2 artifact storage, sync, and export as planned until built.
- `docs/decision-log.md`: record why Fundbeads adopted Go + SQLite + goose + sqlc, why future image artifacts target R2, and how server persistence differs from browser-local IndexedDB.
- `README.md`: add backend setup commands only when the backend actually exists.
- `FEATURES.md` and `FEATURES_ZH.md`: do not claim account login, saved history, or server image storage until those user-facing features exist.

## Done When

- A future implementer can add Go + SQLite + goose + sqlc infrastructure from this instruction without guessing project boundaries.
- The instruction distinguishes browser-local IndexedDB from server-authority persistence.
- The instruction preserves local browser image processing as the current product contract.
- The instruction defines minimal future-ready tables for users, email login challenges, saved patterns, and pattern artifacts.
- The instruction defines R2-ready artifact metadata without implementing R2 integration.
- The instruction rejects hidden login, hidden upload, hidden R2 writes, hidden sync, and storing image bytes in SQLite.
- The instruction defines goose, sqlc, runtime, security, performance, documentation, and verification expectations.
- No XImg business-specific schema or feature semantics are copied into Fundbeads.

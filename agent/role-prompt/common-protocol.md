# Fundbeads Common Role Protocol

All Fundbeads roles must follow this protocol before applying role-specific rules.

## Read Order
- Read the user request and any assigned instruction first.
- Read `README.md`, `FEATURES.md`, `DESIGN.md`, and only the task-relevant docs under `docs/`.
- For role selection, read `agent/role-prompt/role-router.md`.
- For implementation tasks, read the current code paths before proposing or changing behavior.
- For docs, prompt, or instruction work, verify referenced paths, commands, package names, scripts, generated files, and current feature claims against the repository.
- For image processing, palette data, pattern rendering, Tailwind theme, Docker, or static deployment work, read the owning docs before making scope or architecture claims.

## Documentation Rules
- Use repo-relative paths for in-repo files.
- Write steady-state docs: describe what Fundbeads is and how it works now. Put future work in explicit `Planned`, `Backlog`, or `Decision` sections.
- Keep `README.md`, `FEATURES.md`, `FEATURES_ZH.md`, `DESIGN.md`, `docs/`, `agent/instructions/`, and role prompts aligned.
- Prefer linking to the owning doc over duplicating the same rule in multiple places.
- If a change alters durable product direction, architecture, deployment topology, local-processing guarantees, pattern contracts, palette source policy, or role/instruction policy, require a matching doc update.

## Instruction Lifecycle
- Instructions live under `agent/instructions/` unless the task explicitly targets another instruction area.
- Each executable instruction must be atomic, reviewable in one pass, and include goal, scope, required changes, forbidden dependencies or required patterns, acceptance criteria, required tests, verification commands, and decision-log status when relevant.
- Completion markers apply to executable implementation instructions. Planning, research, role-prompt, and reference docs do not need completion markers unless the user or instruction explicitly requires them.
- Worker marks completion by adding `[COMPLETED]` to the instruction H1 and a `## Completion` section with `Completed by`, `Commands`, and `Date`.
- Reviewer approval requires adding `Reviewed by` to the completion section.
- An instruction is officially done only when both `[COMPLETED]` and `Reviewed by` exist.

## Quality Bar
- Preserve Fundbeads' client-only architecture unless the user explicitly approves a product direction change.
- Do not add a backend, database, server upload route, telemetry sink, or third-party image processing service without explicit approval.
- Prefer existing project patterns, documented primitives, structured TypeScript types, and pure utilities over ad hoc logic.
- Do not preserve prototype branches, stale aliases, or compatibility paths unless a current product contract owns them.
- Treat image decoding, canvas sampling, alpha handling, palette matching, grid rendering, bead counting, static build output, and generated design tokens as product-critical surfaces.
- If replacing a system or pattern, require negative verification that the old pattern is gone where in scope.

## Verification
- Evidence comes before completion claims.
- Follow instruction-specified verification commands.
- If no command is specified, default to relevant scoped checks.
- For broad Fundbeads work, prefer `pnpm design:generate`, `pnpm check`, and manual browser verification of upload, resolution switching, grid rendering, axis numbering, and color counts.
- Run build only at phase boundaries or when the task changes build/deploy behavior.
- Verification reports must include commands run, pass/fail status, and residual risk.

## Coordination
- Preserve concurrent edits. Re-read files before editing and merge with existing user or agent changes.
- If requirements conflict with code reality, docs, instruction sequence, or role authority, stop and escalate to Top.
- If the same execution attempt fails twice for the same reason, stop repeating and refine the instruction or architecture.
- If the task would touch more than 10 files, split it into smaller themed tasks before editing.

## Project Boundaries
- Browser-only image processing is a core product promise.
- Uploaded images must not leave the browser.
- The active MARD palette is the built-in static `mard-221` dataset.
- The supported output dimensions are integer `width` and `height` derived from source aspect ratio and selected longest edge; the longest edge is clamped to `40..100`, and the shorter side may be below `40` but not below `1`.
- Pattern cells use 1-based `x` and `y` coordinates.
- Color usage totals are derived from non-null cells in the current effective pattern, not from UI text.
- Docker and deployment assets must serve static frontend output only.
- `frontend/src/design-theme.generated.css` is generated from `DESIGN.md`; do not hand-edit it.

## Current State Check
`I have read the common protocol, verified the task scope, and am ready to apply the selected role.`

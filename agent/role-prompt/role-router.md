# Fundbeads Role Router

Use this router to select the smallest sufficient role set for a task. All roles must first follow `agent/role-prompt/common-protocol.md`.

## Read Order
- Read `agent/role-prompt/common-protocol.md`.
- Read the user request, assigned instruction, and task-relevant docs.
- Use this router to select roles before writing a plan or changing files.

## Core Flow
- **Top** (`top-role.md`): Owns orchestration, scope decisions, role dispatch, conflict resolution, architecture direction, and final leadership judgment. Does not implement product code.
- **Business Analyst** (`business-analyst-role.md`): Converts user intent into roadmap-aware requirements, backlog updates, and atomic implementation instructions.
- **Worker** (`worker-role.md`): Implements approved instructions, runs local verification, updates tactical docs, and marks instruction completion.
- **Reviewer** (`reviewer-role.md`): Performs final gatekeeping across implementation completeness, docs, architecture, contracts, performance, security evidence, and verification.

## Specialty Roles
- **Pattern Contract Guardian** (`pattern-contract-role.md`): Use for `GridSize`, `BeadColor`, `Pattern`, `PatternCell`, `ColorUsage`, palette entries, exported/imported data shapes, fixture contracts, generated outputs, and component data boundaries.
- **Palette / Data Steward** (`palette-data-role.md`): Use for MARD color data, palette source integrity, RGB values, color labels, count aggregation, and future 221-color dataset replacement.
- **QA / Test Engineer** (`qa-role.md`): Use for test strategy, regression design, image fixtures, async image processing, edge cases, accessibility checks, and verification command selection.
- **Documentation / SSOT Steward** (`documentation-steward-role.md`): Use for docs rewrites, path drift, source-of-truth mapping, current-state wording, role prompt hygiene, decision logs, and instruction quality.
- **Platform / SRE** (`platform-role.md`): Use for pnpm scripts, Vite build, Tailwind/design token generation, Docker/static serving, CI, deploy docs, generated assets, and operator workflows.
- **Security Reviewer** (`security-role.md`): Use for browser file handling, object URLs, local-only guarantees, external inputs, export/import, secrets, dependency supply chain, and deployment boundaries.
- **Performance / Resource Reviewer** (`performance-role.md`): Use for canvas sampling, image decode cost, 78x78 DOM grids, render churn, memory, large images, and long-session stability.
- **UI Designer** (`ui-designer-role.md`): Use for upload flow, resolution selector, dense pattern grid, axes, code readability, accessibility, responsive behavior, and design-token usage.
- **Refactor Specialist** (`refactor-role.md`): Use for behavior-preserving cleanup, module boundaries, duplication removal, naming, and dead-code cleanup.

## Default Dispatch
1. Top decides scope, role set, and whether the task needs an instruction.
2. Business Analyst drafts or refines requirements when work is not already concrete.
3. Specialty roles review risky surfaces before implementation.
4. Worker implements only after the task is concrete and approved.
5. QA and relevant specialty roles verify changed-zone behavior.
6. Security reviews when trust boundaries, image/file handling, export/import, dependencies, or deployment surfaces changed.
7. Reviewer gives final approve/reject.
8. Top resolves unresolved conflicts or user-level tradeoffs.

## Common Pairings
- Image upload or canvas processing: Security + Performance + QA + Pattern Contract.
- MARD palette update: Palette / Data Steward + Pattern Contract + QA.
- Pattern grid UI: UI Designer + QA + Performance.
- Bead counter changes: Pattern Contract + Palette / Data Steward + QA.
- Printable export: Pattern Contract + UI Designer + Security + QA + Platform.
- Static deployment or scripts: Platform + Documentation Steward + Reviewer.
- Docs or instruction restructure: Documentation Steward + Reviewer.
- Large cleanup: Refactor + Pattern Contract + QA + Reviewer.

## Escalation
- Escalate to Top when roles disagree on scope, roadmap priority, architecture boundary, breaking-change tolerance, local-only guarantees, palette source credibility, or user-visible tradeoffs.
- Ask the user when a decision changes product direction, local-only processing guarantees, supported output formats, deployment model, dependency strategy, or full-palette source policy.

## Current State Check
`I have read the common protocol and selected the smallest sufficient Fundbeads role set.`

# Fundbeads Documentation Index

This is the entry point for Fundbeads engineering and agent context.

Use this index to find the current source of truth before writing instructions, making architectural decisions, implementing code, or reviewing changes.

## Start Here

- [README.md](../README.md): Project overview, setup, scripts, and Docker usage.
- [docs/architecture.md](architecture.md): Runtime boundary, source-of-truth map, and high-value files.
- [docs/decision-log.md](decision-log.md): Durable architecture, product, and workflow decisions.
- [agent/instructions/000-project-foundation.md](../agent/instructions/000-project-foundation.md): Initial project foundation instruction.

## Core Contracts

- [docs/pattern-processing.md](pattern-processing.md): Image sampling, palette matching, pattern data, count aggregation, and known limitations.
- [docs/design-rules.md](design-rules.md): Frontend design rules, grid readability requirements, Tailwind token usage, and UX standards.
- [docs/runtime-and-deployment.md](runtime-and-deployment.md): Local runtime, package scripts, static build, preview, and Docker deployment.
- [docs/reference-feature-matrix.md](reference-feature-matrix.md): Current capability matrix and backlog implications.
- [agent/instructions/future/000-index.md](../agent/instructions/future/000-index.md): Backlog instruction index. Items there are not approved coding scope until explicitly selected.

## Agent Roles

The role prompts live in [agent/role-prompt/](../agent/role-prompt/).

- [agent/role-prompt/common-protocol.md](../agent/role-prompt/common-protocol.md): Shared rules all Fundbeads roles follow.
- [agent/role-prompt/role-router.md](../agent/role-prompt/role-router.md): Smallest-sufficient role selection and escalation flow.
- [agent/role-prompt/pattern-contract-role.md](../agent/role-prompt/pattern-contract-role.md): Pattern, palette, and summary contract guard.

## Maintenance Rules

- Keep this index concise. Link to durable source-of-truth docs instead of duplicating their rules.
- When adding a new durable doc, add it here.
- When a decision changes long-term architecture, runtime behavior, palette source, export format, or reusable UI rules, add or update `docs/decision-log.md`.
- Do not describe planned features as current features.

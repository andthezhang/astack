---
name: astack-cleanup
description: "Use to clean up non-doc structure drift — overlapping skills, duplicated runtime config, stale compatibility files, entrypoints that don't match canonical sources. MUST audit before moving. For docs/ structure work (folder layout, CONTEXT.md, AGENTS.md/docs/agents, architecture docs, issues, linting), use astack-docs instead."
---

# astack-cleanup

Structure drift **outside** the docs tree. Docs have their own skill (`astack-docs`) and allowlist-enforced linter.

## Iron Law

AUDIT BEFORE MOVING. NO SWEEPING RENAMES WITHOUT AN INVENTORY.

## Right-Size

Skip this skill when:
- the mess is entirely under `docs/` — go to `astack-docs`
- it's one stale file — just delete it, no process needed
- the user wants new structure, not cleanup — use `astack-brainstorm` to shape it, then `astack-docs` to apply the knowledge contract
- the drift is inside a single skill file — edit it directly

Use when multiple overlapping or duplicated surfaces need to be reconciled across the repo.

## Scope

Covered:
- overlapping or duplicated skills across local and global skill dirs
- runtime-specific config that drifted between `.claude`, `.codex`, or similar
- stale compatibility files, broken entrypoints, unclear canonical sources
- reusable workflow guidance trapped in a project when it should be a portable skill

NOT covered (go to `astack-docs`):
- adding, moving, or removing files under `docs/`
- editing `CONTEXT.md`, `AGENTS.md`, `docs/agents/`, or the doc allowlist
- migrating existing docs into the v2 durable homes
- running the doc linter

## Default Posture

1. Audit before moving files
2. Preserve compatibility entrypoints other tools depend on
3. Simplify structure first, then tighten wording
4. Reusable workflow in skills; project-specific rules in the repo

## Cleanup Pass

**1. Inventory the mess.** Map runtime-specific config in `.claude`/`.codex`, local vs global skills, compatibility files and their dependents, and entrypoints that no longer match canonical sources.

**2. Pick a target shape.** Use the simplest split the repo can support:
- `CONTEXT.md` — durable product words and vocabulary
- `AGENTS.md` / `docs/agents/` — agent operating rules and dispatch guidance
- `docs/architecture/ARCHITECTURE.md` — current implemented picture
- `docs/architecture/decisions/` — decision history with implementation state
- external issue tracker or `docs/issues/` — product/design/execution work and debt
- `.claude`, `.codex` — runtime hooks, prompts, config
- skills — reusable cross-project workflows

**3. Choose the smallest moves.** Prefer merging duplicates into one canonical location, deleting stale config over rewriting, compatibility links only where they prevent breakage. Avoid giant rename sweeps unless the user explicitly wants one.

**4. Separate by responsibility.** Reusable workflow → skill. Words → `CONTEXT.md`. Agent rule → `AGENTS.md`/`docs/agents/`. Runtime behavior → `.claude`/`.codex`. Architecture/decision/issue content → `docs/`. Split files doing several jobs.

**5. Verify.** Key entrypoints still resolve, compatibility links unbroken, new structure explainable in one short paragraph.

## Output Shape

1. Current mess map (inventory)
2. Target structure
3. Recommended cleanup order
4. Concrete moves
5. Compatibility risks

## Durable Output

If the cleanup encodes a standing rule ("runtime config lives in `.claude/`, not in skills"), record it: words in `CONTEXT.md`, agent rules in `AGENTS.md`/`docs/agents/`, current architecture in `docs/architecture/ARCHITECTURE.md`, decisions in `docs/architecture/decisions/<slug>.md`, and deferred cleanup in the external tracker or `docs/issues/active/<slug>.md`.

## Routing

- Cleanup touches `docs/` → hand off to `astack-docs`
- User wants investigation only → combine with `astack-review`
- Cleanup is large → pause and run `astack-brainstorm` first
- Ready to execute → `astack-work`
- Cleanup changes durable standards → follow with `astack-compound`

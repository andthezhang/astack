---
name: astack-docs
description: "Initialize, migrate, maintain, and lint a repo's docs/ structure in the OpenAI-style layout — AGENTS.md, ARCHITECTURE.md, and docs/ with design-docs, exec-plans, generated, product-specs, references, and _legacy folders. Use when setting up docs in a fresh repo, bringing an existing repo under the allowlist, running the doc linter, or syncing docs after code changes. Works per-scope: any directory with its own AGENTS.md is an independent scope, so monorepos opt in per subproject."
---

# astack-docs

One skill for all doc-structure work. The allowlist is the contract. Anything under `docs/` not on the allowlist fails the linter.

## Iron Law

NO DOC OUTSIDE THE ALLOWLIST. NO SCOPE WITHOUT `.astack/` OPT-IN.

## Right-Size

Skip this skill when:
- the user wants code cleanup, not doc cleanup — go to `astack-cleanup`
- the work is editing content inside an existing allowed doc — just edit it
- the user wants a plan drafted, not filed under `docs/exec-plans/` — start in `astack-plan`
- the repo is not opted in yet and the user didn't ask to opt in — ask first

Use when filing, moving, initializing, syncing, or linting doc structure.

## Target Shape

```
AGENTS.md                     # ≤150 lines, table of contents
ARCHITECTURE.md               # top-level map of the system
docs/
├── DESIGN.md
├── FRONTEND.md
├── PLANS.md
├── PRODUCT_SENSE.md
├── QUALITY_SCORE.md
├── RELIABILITY.md
├── SECURITY.md
├── design-docs/              # decisions, YAML frontmatter required
│   ├── index.md
│   ├── stable/               # optional: split by status. when present,
│   ├── draft/                # folder name MUST equal frontmatter status:
│   └── archived/             # — both are sources of truth, must agree.
├── exec-plans/
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
├── generated/                # must carry a "GENERATED" header comment
├── product-specs/
│   └── index.md
├── references/               # external docs; any file type, any depth
└── _legacy/                  # temporary quarantine during migration
```

## Single Scope Is the Default

Most monorepos should run with one root scope. Splitting invites duplication — cross-cutting docs (security, architecture, pipelines spanning tiers) have no clean home and end up copied. Split only when a subproject is genuinely a separate product: own team, own release cadence, or on the path to its own repo. A backend and its iOS client in one repo usually isn't that.

When a subproject stays under the root scope:

- Keep its `AGENTS.md` for agent routing context
- Do **not** add a `docs/` folder inside it
- Do **not** add structural markdown (`DESIGN.md`, `FRONTEND.md`, `PLANS.md`, `PRODUCT_SENSE.md`, `QUALITY_SCORE.md`, `RELIABILITY.md`, `SECURITY.md`) at its root
- Point new content to the root docs tree via a short pointer block in its `AGENTS.md`:

```md
## Docs
Architectural docs, design-docs, and exec-plans live at the repo root:
- `../AGENTS.md`, `../docs/design-docs/`, `../docs/exec-plans/active/`

Write new doc content at the root tree. Do not add a docs/ folder here.
```

The linter enforces this via descendant-drift checks (Mode 3). When a subproject genuinely needs its own scope, opt in by running snapshot mode from that subproject's root — creates `.astack/` and graduates it.

## Mode 1: Snapshot (first-time init)

Use when no `AGENTS.md` exists in the scope or the user wants to opt the repo in.

1. Read the repo. List every existing doc-like file: root markdown, `docs/`, `design/`, `specs/`, `.github/`, anywhere else.
2. Propose a migration map as one table: each existing file → destination (design-doc / product-spec / exec-plan / architecture / `_legacy` / delete). User approves once.
3. On approval: write `AGENTS.md`, `ARCHITECTURE.md`, and required `docs/*` files with project-specific content (read the code first — no `# Section (fill in)` stubs); move existing docs to destinations with YAML frontmatter; send unclassifiable files to `docs/_legacy/`; write `lefthook.yml` with a pre-commit hook running the linter; `lefthook install`; write `.astack/last-sync` with `git rev-parse HEAD`.
4. Run the linter. Fix until green.

## Mode 2: Delta (periodic sync)

Use after meaningful work when docs may have drifted. Usually triggered by `astack-compound`.

1. Read `.astack/last-sync`.
2. `git log <sha>..HEAD --name-only --no-merges` to list changed paths.
3. Route each touched area: new schemas → `docs/generated/*`; architectural change → `docs/design-docs/<slug>.md`; finished plan → move `docs/exec-plans/active/` → `docs/exec-plans/completed/`; known debt → append to `docs/exec-plans/tech-debt-tracker.md`.
4. Write new HEAD to `.astack/last-sync`. Run the linter. Fix until green.

## Mode 3: Lint

Deterministic. No judgment. Runs from pre-commit, CI, or on demand.

```bash
bun run ~/.agents/skills/astack-docs/lint/lint.ts [scope-path]
```

Default scope is the current working directory. The script walks down, finds every opted-in scope (directory with both `AGENTS.md` and `.astack/`), and lints each against the allowlist. Exits non-zero on violation with an actionable `FIX:` line per error. `.DS_Store`, `Thumbs.db`, `.gitkeep`, and `.keep` are skipped automatically.

Checks inside each scope:
- Required files exist
- `AGENTS.md` ≤ 150 lines
- No files under `docs/` outside the allowlist
- YAML frontmatter present on `design-docs/`, `exec-plans/`, `product-specs/`
- `folders:` frontmatter field present on each design-doc / exec-plan / product-spec, and its values are valid per `.astack/folders.txt`
- `docs/references/**/*` — any file type, any depth, no shape requirement
- For docs under `design-docs/{stable,draft,archived}/`: frontmatter `status:` must equal the folder name (folder + frontmatter both source of truth — divergence is an error)

Descendant-drift checks for un-opted-in subdirectories (AGENTS.md present, `.astack/` absent):
- No `docs/` folder (would be a parallel, unmanaged doc tree)
- No reserved structural markdown at the subdirectory root (`DESIGN.md`, `FRONTEND.md`, `PLANS.md`, `PRODUCT_SENSE.md`, `QUALITY_SCORE.md`, `RELIABILITY.md`, `SECURITY.md`)
- `ARCHITECTURE.md` is allowed at subdirectory roots — packages may reasonably describe their own internals without opting into scope management.

## Frontmatter Convention

Every design-doc, exec-plan, and product-spec starts with:

```yaml
---
status: stable              # or: draft, active, completed, archived
updated: 2026-04-21         # YYYY-MM-DD
folders: [mobile]           # subprojects this doc applies to
---
```

The `folders:` field is always an array, even with one value (`[service]`). Use `[service, mobile]` for docs spanning surfaces, and `[all]` only for genuinely cross-cutting content (architecture, system-wide decisions) — prefer specific folders otherwise. Valid values are configured per-scope in `.astack/folders.txt` (one name per line, `#` for comments); `all` is always implicit.

`folders` powers index grouping, filtering ("what design-docs apply to `service`?"), and ownership clarity for multi-surface changes.

## References folder

`docs/references/` holds external material — vendor docs, API specs, papers, llms.txt dumps. The linter accepts **any file type, any depth**; organize by source (e.g. `docs/references/<vendor>/<file>`). No frontmatter required. Keep it tidy; the linter won't.

## Working Rules

- Write project-specific content. Never placeholder stubs.
- Read the code before writing `ARCHITECTURE.md` or design-docs.
- `_legacy/` is temporary — existing work continues, but new content never lands there.
- Don't bypass the linter with `--no-verify`. Fix the root cause.
- `AGENTS.md` is a map, not a manual. If it grows past 150 lines, move content into `docs/` and link.

## Handoffs

- Non-doc structure (overlapping skills, runtime config, entrypoints) → `astack-cleanup`
- Triggered after meaningful work → usually entered via `astack-compound`
- `astack-wiki` is retired. Synthesized knowledge lives in `docs/design-docs/`; external refs in `docs/references/`

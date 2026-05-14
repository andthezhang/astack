---
name: astack-docs
description: "Initialize, migrate, maintain, and lint a repo's v2 knowledge contract: AGENTS.md, CONTEXT.md, CONTEXT-MAP.md, docs/architecture, docs/agents, optional local issues, references, and _legacy. Use when setting up docs in a fresh repo, bringing an existing repo under the allowlist, running the doc linter, or syncing docs after code changes. Works per-scope: a directory opts in when it has both AGENTS.md and .astack/."
---

# astack-docs

One skill for repo knowledge structure. The allowlist is the contract. Anything under `docs/` outside the contract fails the linter.

## Iron Law

NO PRIMARY DOC OUTSIDE THE V2 CONTRACT. NO MANAGED SCOPE WITHOUT `.astack/` OPT-IN.

`design-docs/`, `exec-plans/`, and `product-specs/` are retired primary concepts. Existing material may live under `docs/_legacy/`, but new knowledge must land in the v2 homes below.

## Right-Size

Skip this skill when:
- the user wants code cleanup, not doc cleanup - go to `astack-cleanup`
- the work is editing content inside an existing allowed doc - just edit it
- the user wants planning help but not repo knowledge updates - start in `astack-brainstorm`
- the repo is not opted in yet and the user did not ask to opt in - ask first

Use when filing, moving, initializing, syncing, or linting doc structure.

## Target Shape

```
AGENTS.md                         # agent routing and local rules, max 150 lines
CONTEXT.md                        # current repo/product context
CONTEXT-MAP.md                    # map of important markdown docs and where to look
DESIGN.md                         # optional standing doc
FRONTEND.md                       # optional standing doc
SECURITY.md                       # optional standing doc
RELIABILITY.md                    # optional standing doc
docs/
├── architecture/
│   ├── ARCHITECTURE.md           # canonical system map
│   └── decisions/
│       └── *.md                  # architecture decisions, YAML frontmatter required
├── agents/
│   ├── issue-tracker.md          # how local issues are managed
│   └── triage-labels.md          # allowed label vocabulary and usage
├── issues/
│   ├── active/
│   │   └── *.md                  # optional local issues, YAML frontmatter required
│   └── completed/
│       └── *.md                  # optional completed local issues
├── references/                   # external docs; any file type, any depth
└── _legacy/                      # quarantine for old docs and migrations
```

Required files:
- `AGENTS.md`
- `CONTEXT.md`
- `CONTEXT-MAP.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`

Allowed but not required at the scope root:
- `DESIGN.md`
- `FRONTEND.md`
- `SECURITY.md`
- `RELIABILITY.md`

## Document Roles

`AGENTS.md` is the operating map for agents. Keep it short and link out.

`CONTEXT.md` is the current shape of the product, repo, and runtime. It should help an agent rejoin the work without rereading every file.

`CONTEXT-MAP.md` is the index of durable knowledge. Use normal markdown links or backticked paths to point at important markdown docs. The linter checks referenced markdown paths when it can.

`docs/architecture/ARCHITECTURE.md` is the canonical architecture map. Put stable system shape here, not temporary plans.

`docs/architecture/decisions/*.md` holds decisions. Decisions are not design docs; they record what was chosen, why, and how far implementation has gone.

`docs/issues/active/*.md` and `docs/issues/completed/*.md` are local issues. Use them for repo-local follow-up when GitHub issues are not the right place.

`docs/references/**` holds external material: vendor docs, API specs, papers, llms.txt dumps, screenshots, and other reference files. The linter accepts any file type at any depth.

`docs/_legacy/**` is a quarantine. Existing work can move there during migration. Do not create new primary knowledge there.

## Architecture Decision Frontmatter

Every file in `docs/architecture/decisions/*.md` starts with:

```yaml
---
status: accepted              # proposed, accepted, or superseded
implementation: partial       # planned, partial, or implemented
updated: 2026-05-06           # YYYY-MM-DD
tracks:
  - docs/issues/active/example.md
---
```

Rules:
- `status`, `implementation`, and `updated` are required.
- `implementation: planned` or `implementation: partial` requires `tracks`.
- `implementation: implemented` requires `evidence`.
- `status: superseded` requires `superseded_by`.
- `updated` uses `YYYY-MM-DD`.

Use `tracks` for open work and `evidence` for landed code, PRs, tests, deploy receipts, or other proof.

## Local Issue Frontmatter

Every file in `docs/issues/active/*.md` or `docs/issues/completed/*.md` starts with:

```yaml
---
status: active                # must match the folder: active or completed
updated: 2026-05-06           # YYYY-MM-DD
labels: [docs]
---
```

Rules:
- `status`, `updated`, and `labels` are required.
- `status` must match the folder.
- `labels` is a non-empty YAML array.
- Label meanings live in `docs/agents/triage-labels.md`.

## Single Scope Is the Default

Most monorepos should run with one root scope. Split only when a subproject is genuinely a separate product: own team, own release cadence, or on the path to its own repo.

When a subproject stays under the root scope:
- Keep its `AGENTS.md` for agent routing context if needed.
- Do not add a `docs/` folder inside it.
- Do not add `CONTEXT.md`, `CONTEXT-MAP.md`, `ARCHITECTURE.md`, `DESIGN.md`, `FRONTEND.md`, `SECURITY.md`, or `RELIABILITY.md` at its root.
- Point durable content to the root knowledge tree via a short pointer block in its `AGENTS.md`.

The linter enforces this with descendant-drift checks. When a subproject genuinely needs its own scope, run snapshot mode from that subproject root to create `.astack/` and graduate it.

## Mode 1: Snapshot

Use when no `AGENTS.md` exists in the scope or the user wants to opt the repo in.

1. Read the repo. List existing doc-like files: root markdown, `docs/`, `design/`, `specs/`, `.github/`, and other obvious knowledge files.
2. Propose a migration map: each existing file -> v2 destination (`CONTEXT.md`, `CONTEXT-MAP.md`, architecture, decision, local issue, reference, `_legacy`, or delete). User approves once.
3. On approval: write required v2 files with project-specific content. Move retired `design-docs/`, `exec-plans/`, and `product-specs/` material under `docs/_legacy/` unless it is actively rewritten into the v2 model.
4. Write `.astack/last-sync` with `git rev-parse HEAD`.
5. Run the linter and fix until green.

## Mode 2: Delta

Use after meaningful work when durable knowledge may have drifted. Usually triggered by `astack-compound`.

1. Read `.astack/last-sync`.
2. Use `git log <sha>..HEAD --name-only --no-merges` to list changed paths.
3. Route each touched area:
   - standing context drift -> update `CONTEXT.md` or `CONTEXT-MAP.md`
   - architecture shape changed -> update `docs/architecture/ARCHITECTURE.md`
   - decision made -> write or update `docs/architecture/decisions/<slug>.md`
   - follow-up needed -> write `docs/issues/active/<slug>.md`
   - follow-up finished -> move active issue to `docs/issues/completed/`
   - external material -> store under `docs/references/`
4. Write new HEAD to `.astack/last-sync`.
5. Run the linter and fix until green.

## Mode 3: Lint

Deterministic. No judgment. Runs from pre-commit, CI, or on demand.

```bash
bun run ~/.agents/skills/astack-docs/lint/lint.ts [scope-path]
```

Default scope is the current working directory. The script walks down, finds every opted-in scope (directory with both `AGENTS.md` and `.astack/`), and lints each against the allowlist. It exits non-zero on violations with actionable `FIX:` lines.

Checks inside each scope:
- Required files exist.
- `AGENTS.md` is at most 150 lines.
- Files under `docs/` match the v2 allowlist.
- Retired primary folders (`docs/design-docs/`, `docs/exec-plans/`, `docs/product-specs/`) are absent except under `docs/_legacy/`.
- Architecture decisions have required frontmatter and conditional fields.
- Local issues have required frontmatter and folder-matching status.
- `CONTEXT-MAP.md` references to markdown paths resolve when practical.
- `docs/references/**/*` and `docs/_legacy/**/*` accept any file type and depth.

Ignored anywhere under `docs/`: `.DS_Store`, `Thumbs.db`, `.gitkeep`, and `.keep`.

## Working Rules

- Write project-specific content. Never placeholder stubs.
- Read code before writing `CONTEXT.md`, `ARCHITECTURE.md`, or decisions.
- Keep `_legacy/` temporary. New primary knowledge does not land there.
- Do not bypass the linter with `--no-verify`. Fix the root cause.
- Keep `AGENTS.md` as a map, not a manual. If it grows past 150 lines, move content into the v2 knowledge tree and link.

## Handoffs

- Non-doc structure drift -> `astack-cleanup`
- Durable knowledge capture after meaningful work -> usually entered via `astack-compound`
- Runtime plans that should become work items -> `docs/issues/active/*.md`

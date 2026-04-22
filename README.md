# astack

Thin agent-workflow skills for coding work, plus a doc-structure linter. Agent-agnostic — works with any coding agent that respects the SKILL.md convention.

astack is a small, opinionated set of routing skills that give AI coding agents a shared vocabulary for brainstorming, planning, execution, review, QA, shipping, cleanup, and knowledge compounding. It also enforces a repo-wide documentation structure so docs don't drift when the agents do most of the writing.

## What's in the box

| Skill | Role |
|---|---|
| `astack` | Meta-skill — sizes the task (SMALL/MEDIUM/LARGE) and routes to the right workflow |
| `astack-brainstorm` | Think through problems before coding |
| `astack-plan` | Turn requirements into an implementation plan |
| `astack-work` | Implement or debug once requirements are clear |
| `astack-review` | Read-only review of code, docs, or plans |
| `astack-qa` | Test flows, repro bugs, grade with a rubric |
| `astack-ship` | Commit, push, PR, deploy |
| `astack-cleanup` | Non-doc structure fixes (skills, runtime config, entrypoints) |
| `astack-compound` | Distill durable knowledge after meaningful work (success path) |
| `astack-skills` | Maintain the skill layer — lessons, audits, drift detection (mistake path) |
| `astack-docs` | Init / migrate / lint the docs tree — [OpenAI-style](https://agents.md/) layout, per-scope |

Nine workflow skills + two enforcement skills. The contract is the `astack-docs` allowlist: `AGENTS.md`, `ARCHITECTURE.md`, and a fixed shape under `docs/` that the linter mechanically checks.

## Skills as materialized views

astack treats skills as **materialized views on top of docs**. Docs are the source of truth — design decisions, product sense, architecture. Skills are trigger-indexed projections of those docs, shaped to hit the agent's description matcher at the right moment. The two layers serve different readers: docs are canonical and browsed by humans on purpose; skills are short, indexed, and fired by situations.

That framing gives astack a natural maintenance loop:

- **Write**: docs capture principles. A skill materializes the view of a doc that routes agents correctly.
- **Cite**: every skill declares `source_docs:` in its frontmatter — the docs it projects. That citation makes refresh and drift detection possible.
- **Compound (success path)**: after meaningful work that went well, `astack-compound` distills durable rules and files them in the right home — a doc, a skill body, or `AGENTS.md`.
- **Learn (mistake path)**: after a user correction or failed output, `astack-skills` captures a lesson in `<skill>/lessons.md`. Recurring lessons graduate into the skill body; stale ones decay after a quarter.
- **Audit**: monthly, `astack-skills` reads accumulated lessons and proposes graduate / prune / merge / demote / delete. A human applies.
- **Drift**: daily, `astack-skills` harvests `(commit, doc)` pairs from the last 24h and flags where recent code contradicts a doc a skill claims to materialize.

The whole loop is git-native — no runtime telemetry, no hooks. Git history is the audit log.

**Rule of thumb**: `README.md` is for humans. Every other markdown file in an astack-shaped repo is for an AI. Conventions the agent applies belong in a SKILL.md; narrative explanation belongs here.

## The docs contract

When a scope opts in (creates `.astack/` at its root), the linter enforces:

```
AGENTS.md                     ≤ 150 lines, table of contents
ARCHITECTURE.md               top-level system map
docs/
├── DESIGN.md, FRONTEND.md, PLANS.md, PRODUCT_SENSE.md,
│   QUALITY_SCORE.md, RELIABILITY.md, SECURITY.md
├── design-docs/              decisions, YAML frontmatter required
│   └── index.md
├── exec-plans/
│   ├── active/               in-flight plans
│   ├── completed/
│   └── tech-debt-tracker.md
├── generated/                auto-generated artifacts
├── product-specs/
├── references/               external docs as *-llms.txt
└── _legacy/                  temporary quarantine during migration
```

Every design-doc, exec-plan, and product-spec needs YAML frontmatter with at minimum:

```yaml
---
status: stable              # or: draft, active, completed, archived
updated: 2026-04-21
folders: [mobile]           # subprojects this doc applies to, or [all]
---
```

Valid values for `folders:` are configured per-repo in `.astack/folders.txt`.

## Install

Using `npx skills`:

```bash
npx skills add andthezhang/astack -g -y
```

Installs all 10 `astack-*` skills from the repo's `skills/` folder. The default install path is `~/.agents/skills/<skill-name>/` with symlinks created into every agent's own skill directory (Claude Code, Cursor, Codex, Continue, Crush, and others). Run `npx skills update -y` to pull the latest.

For project-local install (skills vendored into the repo instead of installed per-user), add `--project` / `-p` instead of `-g`.

## Wiring a repo

Each repo opts in independently. From the repo root:

1. Ask the agent: "initialize astack docs for this repo" — it invokes `astack-docs` in snapshot mode.
2. The skill walks the existing docs, proposes a migration map, executes moves into the allowlist shape, and writes `.astack/last-sync`.
3. Commit the initial docs structure.
4. Install a pre-commit hook that runs the linter. The hook resolves the lint script across common install locations (project-local → user-global → agent-specific), so it works regardless of where the skill got installed:

   ```bash
   # scripts/install-git-hooks.sh in your repo
   cat > .git/hooks/pre-commit <<'HOOK'
   #!/usr/bin/env bash
   set -e
   REPO_ROOT="$(git rev-parse --show-toplevel)"
   # Only run if this repo has opted in.
   [ -d "$REPO_ROOT/.astack" ] || exit 0

   # Resolve astack-docs lint.ts across common install locations.
   LINT=""
   for c in \
     "$REPO_ROOT/.agents/skills/astack-docs/lint/lint.ts" \
     "$HOME/.agents/skills/astack-docs/lint/lint.ts" \
     "$HOME/.claude/skills/astack-docs/lint/lint.ts"; do
     [ -f "$c" ] && LINT="$c" && break
   done

   # Missing astack or missing bun? Skip silently — don't break commits
   # for teammates who haven't installed astack yet.
   [ -z "$LINT" ] && exit 0
   command -v bun >/dev/null 2>&1 || exit 0

   exec bun run "$LINT" "$REPO_ROOT"
   HOOK
   chmod +x .git/hooks/pre-commit
   ```

   The hook is a no-op when astack isn't installed or when the repo hasn't opted in (no `.astack/` directory), so it's safe to run the install script in any repo.

## Monorepos: single root scope by default

Even in monorepos with multiple subprojects, run one root scope unless a subproject is genuinely a separate product. The linter's descendant-drift check flags rogue `docs/` folders in subprojects and reserved structural markdown (`DESIGN.md`, `FRONTEND.md`, etc.) at subproject roots — nudging you back to a single tree.

A subproject genuinely needs its own scope only when it has its own team, release cadence, or is headed for its own repo. In that case, run `astack-docs` snapshot inside it.

## Requirements

- [Bun](https://bun.sh) ≥ 1.0 (for running the linter)
- Git (for the pre-commit hook path)
- A coding agent that reads SKILL.md files — Claude Code, Codex, or similar

No Node, no compile step, no build. The linter is plain TypeScript that Bun runs directly.

## Philosophy

astack is thin on purpose. Workflow skills are routing prose — judgment, not execution. The one deterministic surface is the doc linter, because that's the only thing that needs to block an agent's drift. Everything else stays soft.

If you want execution-heavy skills (real browser automation, real deploys, real QA harnesses), see [gstack](https://github.com/garrytan/gstack) — astack is the opinion layer that sits above whatever execution tools you pick.

## Prior art

astack stands on the shoulders of a few conventions and essays worth reading directly:

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) and [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Anthropic's posts on how the surface around the model (tools, docs, routing prose) determines whether an agent can sustain long work. astack is a harness: skills are the surface, docs are the state.
- [Harness engineering](https://openai.com/index/harness-engineering/) — OpenAI's framing of the same idea. The astack routing skills (`astack`, `astack-brainstorm`, etc.) are harness in the sense these posts mean.
- [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) ([essay](https://every.to/source-code/compound-engineering-the-definitive-guide)) — Every's plugin and Kieran Klaassen's essay on making each unit of engineering work make the next one easier. astack's write → cite → compound → learn → audit loop is the compounding mechanic applied to the skill/doc layer.
- [Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) — spec-driven workflow that fights context rot by externalizing state into files and running each phase in a fresh context. astack's brainstorm → plan → work → review → ship → compound pipeline is the same shape, thinner.
- [gstack](https://github.com/garrytan/gstack) — execution-heavy skills (browser automation, deploys, QA harnesses). astack is the thin opinion layer that can sit above whatever execution tools you pick.

## License

MIT. See [LICENSE](LICENSE).

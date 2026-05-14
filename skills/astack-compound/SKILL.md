---
name: astack-compound
description: "Use AFTER meaningful work to distill durable knowledge — standing rules, architecture notes, reusable skills, in-repo docs. MUST capture or lose: a fix/decision/review/ship that produced learning should update standing artifacts so insight doesn't stay trapped in chat. When the work touched code paths docs reference, delegate to astack-docs delta mode and end green against the linter."
---

# astack-compound

Run after meaningful work, not every tiny task. The goal is the smallest durable update that helps future work without creating doc sprawl.

## Iron Law

NO MEANINGFUL WORK WITHOUT A DURABILITY PASS. CAPTURE OR LOSE.

## Right-Size

Skip this skill when:
- the work was a one-off typo, formatting, or trivial patch
- nothing was learned — just a mechanical edit the next agent will rediscover trivially
- the "insight" is already captured in the commit message and doesn't generalize
- the user is mid-task and wants to keep momentum — queue compound for later

Run it when a fix encodes a standing rule, a decision needs a home, or docs now contradict reality.

## Choose the Right Home

- `CONTEXT.md` — durable product words, naming, positioning, and vocabulary
- `docs/architecture/ARCHITECTURE.md` — the current implemented picture
- `docs/architecture/decisions/` — decision history, each with implementation state
- External issue tracker or `docs/issues/` — product, design, execution work, and deferred cleanup
- `AGENTS.md` / `docs/agents/` — standing repo/directory rules, dispatch guidance, local conventions
- Skills — reusable workflow behavior that travels across projects
- `.claude` / `.codex` — runtime hooks, prompts, config

If the update belongs under `docs/`, hand off to `astack-docs` for placement and let its allowlist keep structure honest.

When the trigger is a **mistake** (user correction, failed output, bad advice from a skill) or a **scheduled sweep** (monthly audit, daily drift), use `astack-skills` instead — this skill focuses on post-success capture.

## Rules

- Prefer updating an existing artifact over creating a new duplicate
- Keep durable notes concise and operational
- No timestamped clutter unless the repo already uses that pattern intentionally
- If no durable update is justified, say so explicitly — silence is worse than "nothing to record"

## Common Triggers

- A new standing rule emerged
- A doc is now wrong because of the work
- A skill should change how future tasks are routed or executed
- A conversation produced reusable insight worth keeping
- Code landed that contradicts `docs/architecture/ARCHITECTURE.md` or `docs/architecture/decisions/`

## Doc Delta (when the work touched code)

When the pass involves changed code, use `astack-docs` delta mode to sync:

1. Read `.astack/last-sync` (if missing, treat next step as first sync and write HEAD).
2. `git log <sha>..HEAD --name-only --no-merges` to list what changed.
3. For each touched area:
   - terminology, positioning, or product language changed → update `CONTEXT.md`
   - current implemented architecture changed → update `docs/architecture/ARCHITECTURE.md`
   - a decision was made or revised → add/update `docs/architecture/decisions/<slug>.md` with implementation state
   - product/design/execution follow-up or debt surfaced → update the external tracker or `docs/issues/active/<slug>.md`
   - agent operating rules changed → update `AGENTS.md` or `docs/agents/`
4. Write the new `HEAD` SHA to `.astack/last-sync`.
5. Run the doc linter. Fix until green:
   ```bash
   bun run ~/.agents/skills/astack-docs/lint/lint.ts
   ```

`astack-docs` owns the shape; `astack-compound` owns the trigger and the "what just changed?" read.

## Durable Paths (quick reference)

- Words and vocabulary → `CONTEXT.md`
- Current implemented architecture → `docs/architecture/ARCHITECTURE.md`
- Decision history → `docs/architecture/decisions/<slug>.md` with implementation state
- Product/design/execution/debt work → external issue tracker or `docs/issues/active/<slug>.md`
- Standing agent rules → `AGENTS.md` (short) or `docs/agents/` (longer/multi-agent)
- Mistakes awaiting materialization → `<skill>/lessons.md` (per-skill) or `.astack/pending-lessons.md` (orphan)

## Red Flags

| Rationalization | Reality |
| --- | --- |
| "I'll remember this" | You won't. The next agent definitely won't. |
| "It's obvious from the code" | If it were obvious, this bug wouldn't have happened. Write it. |
| "Docs will catch up later" | Later is never. Do it now or declare "no durable update" explicitly. |

## Closeout

- State which standing artifacts were updated
- State whether the doc linter is green
- Call out any durable insight that did NOT warrant a doc update, so the next pass doesn't re-litigate it

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

- `AGENTS.md` — standing repo/directory rules, dispatch guidance, local conventions
- `docs/` (owned by `astack-docs`) — decisions, plans, solutions, architecture, product specs
- Skills — reusable workflow behavior that travels across projects
- `.claude` / `.codex` — runtime hooks, prompts, config

If the update belongs under `docs/`, hand off to `astack-docs` for placement and let its allowlist keep structure honest.

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
- Code landed that contradicts `docs/design-docs/` or `docs/generated/`

## Doc Delta (when the work touched code)

When the pass involves changed code, use `astack-docs` delta mode to sync:

1. Read `.astack/last-sync` (if missing, treat next step as first sync and write HEAD).
2. `git log <sha>..HEAD --name-only --no-merges` to list what changed.
3. For each touched area:
   - architectural change → new or updated `docs/design-docs/<slug>.md`
   - finished plan → move from `docs/exec-plans/active/` to `docs/exec-plans/completed/`
   - new generated artifact → refresh `docs/generated/*`
   - known debt surfaced → append to `docs/exec-plans/tech-debt-tracker.md`
4. Write the new `HEAD` SHA to `.astack/last-sync`.
5. Run the doc linter. Fix until green:
   ```bash
   bun run ~/.agents/skills/astack-docs/lint/lint.ts
   ```

`astack-docs` owns the shape; `astack-compound` owns the trigger and the "what just changed?" read.

## Durable Paths (quick reference)

- Design decisions → `docs/design-docs/<slug>.md`
- Implementation plans → `docs/exec-plans/active/YYYY-MM-DD-<slug>.md` → moved to `completed/` when done
- Tech debt / deferred cleanup → `docs/exec-plans/tech-debt-tracker.md`
- Standing local rules → `AGENTS.md` (≤ 150 lines)

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

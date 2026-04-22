---
name: astack-compound
description: "Use AFTER meaningful work to run the durable look-back pass: read new commits since the last reviewed SHA, review them for suspicious removals, sync docs when needed, and write the smallest durable follow-up (docs, AGENTS.md, skill body, or lessons.md)."
---

# astack-compound

Run after meaningful work, not every tiny task. Compound is the default look-back pass for an astack-shaped repo: check what changed since the last reviewed commit, sync docs when needed, and capture durable lessons before the next task starts.

## Iron Law

NO MEANINGFUL WORK WITHOUT A LOOK-BACK PASS. READ THE NEW COMMITS. CAPTURE OR FLAG.

## Right-Size

Skip this skill when:
- the work was a one-off typo, formatting, or trivial patch
- nothing changed that a future agent could plausibly trip over
- the user is mid-task and wants to keep momentum — queue compound for later

Run it when code, docs, prompts, or workflow rules changed in a way that should survive the session.

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
- If a merge / rebase conflict would delete remote behavior and you cannot explain why, stop and ask a human instead of "resolving" it away

## Default Loop

1. Read `.astack/last-sync` (or another clearly stated reviewed SHA). This is the baseline for the look-back pass.
2. Read `git log <sha>..HEAD --no-merges --oneline` to see the new commits.
3. If code changed, read the commit diffs yourself and explicitly look for suspicious changes. No script is required. The agent should do the review.
4. For each suspicious finding, decide the smallest durable follow-up:
   - reusable mistake → `<skill>/lessons.md`
   - standing workflow rule → skill body or `AGENTS.md`
   - docs no longer match reality → `astack-docs` delta
   - ambiguous overwrite / merge-conflict resolution → ask a human before proceeding
5. If docs changed, run the doc delta pass.
6. Write the new `HEAD` to `.astack/last-sync`.

If the repo has no `.astack/last-sync`, choose a compare base explicitly and say what it is. Do not hand-wave the range.

## Common Triggers

- A new standing rule emerged
- A doc is now wrong because of the work
- A skill should change how future tasks are routed or executed
- A conversation produced reusable insight worth keeping
- A small task or merge conflict may have accidentally removed behavior

## Suspicious Means

Treat these as "stop and look closer" signals, not automatic guilt:

- a deletion-heavy diff on a small or scoped task
- service / model / environment reads disappear without an obvious replacement
- dynamic behavior appears to have been replaced by literals
- conflict resolution removed remote code outside the requested scope
- a feature path appears to have been deleted even though the task did not ask for feature removal
- a UI stops reading live state and now shows fixed text or fixed arrays instead

## Doc Delta (when docs need to move with the code)

When the look-back pass shows docs drift, use `astack-docs` delta mode to sync:

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
- Mistakes awaiting materialization → `<skill>/lessons.md` (per-skill) or `docs/generated/pending-lessons.md` (orphan)

## Red Flags

| Rationalization | Reality |
| --- | --- |
| "I'll remember this" | You won't. The next agent definitely won't. |
| "It's obvious from the code" | If it were obvious, this bug wouldn't have happened. Write it. |
| "The diff is weird but the task is done" | Weird is the signal. Read the commits and explain the deletion before moving on. |
| "I only changed one small thing, so this feature removal must be fine" | Small tasks are exactly where shortcut deletions hide. Re-read the diff. |
| "Docs will catch up later" | Later is never. Do it now or declare "no durable update" explicitly. |

## Closeout

- State which commit range was reviewed
- State whether suspicious findings were found
- State which standing artifacts were updated
- State whether the doc linter is green when docs changed
- Call out any durable insight that did NOT warrant an update, so the next pass doesn't re-litigate it

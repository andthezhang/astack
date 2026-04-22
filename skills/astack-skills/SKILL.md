---
name: astack-skills
description: "Use to maintain the skill layer as a materialized view on top of docs — capture lessons from mistakes, run monthly audits over accumulated lessons, and detect drift between code commits and the docs skills cite. Use when a user correction lands, a test fails, or a skill's advice proves wrong; also on scheduled sweeps (monthly audit, daily drift). For post-success capture of standing rules/architecture notes, use astack-compound instead."
---

# astack-skills

Skills are materialized views on top of docs. Docs are the source of truth; skills are trigger-indexed projections of docs, optimized for the agent's description matcher. This skill maintains that view layer.

## Iron Law

SKILLS CITE DOCS. LESSONS FEED SKILLS. DRIFT IS FIXED AT THE SOURCE, NOT THE VIEW.

## Frontmatter Schema

Every skill should carry these fields. Missing fields are tolerated during migration but flagged on audit.

```yaml
---
name: my-skill
description: "..."
source_docs: [docs/design-docs/thing.md, docs/PRODUCT_SENSE.md]
verified_at: 2026-04-21
status: active
---
```

- `source_docs` — the docs this skill materializes from. Required unless the skill is not derived from docs (rare — things like pure tool wrappers). The citation is what makes refresh and drift detection possible.
- `verified_at` — last time the skill body was checked against reality. Required. Bumped after every audit pass or material edit.
- `status` — `active` (default), `deprecated` (skill refuses its old thing and redirects), or `graduated` (its lessons have all moved into the body and there's nothing pending).

## Three Modes

### Mode 1: `mistake` — user correction, failed test, bad output

Triggered when something went wrong. Diagnose the category, then write the lesson home.

1. Classify the root cause:
   - `skill-missing` — no skill triggered for the situation. Materialize a new skill from the relevant doc.
   - `skill-wrong` — a skill triggered but its description or body led the agent astray. Sharpen the trigger or correct the body.
   - `doc-missing` — the source principle isn't written down anywhere. Update the doc first, then materialize.
2. Write a `lessons.md` entry. Location:
   - If a skill owns the territory → `<skill>/lessons.md` (per-skill).
   - If no skill owns it yet → `docs/generated/pending-lessons.md` (orphan queue).
3. Commit with message `lesson: <short trigger phrase>` so `git log` stays greppable.

### Mode 2: `audit` — monthly sweep

A curation pass. Does not auto-execute moves — proposes them; a human (or astack-compound) applies.

1. Read `git log --since="1 month ago" -- skills/ docs/` for recent churn.
2. Read every `<skill>/lessons.md` and `docs/generated/pending-lessons.md`.
3. Read `docs/generated/drift-report.md` if present.
4. For each skill, propose one of:
   - **graduate** — a recurring lesson moves from `lessons.md` into the skill body.
   - **prune** — a lesson has been pending >3 months with no recurrence. Delete or archive.
   - **merge** — two skills overlap; fold one into the other.
   - **demote** — skill triggers too broadly and pollutes routing; narrow its description or retire it.
   - **delete** — the skill no longer has a doc basis; the underlying principle went away.
5. Write proposals to `docs/exec-plans/active/YYYY-MM-DD-skill-audit.md` using the standard exec-plan frontmatter. Hand off application to the user or astack-compound.

### Mode 3: `drift` — daily cron

Finds divergence between recent commits and the docs skills cite.

1. Run `scripts/drift-check.ts` to harvest `(commit-diff, candidate-doc)` pairs from the last 24h. The script uses two heuristics:
   - path-slug match (a file `src/auth/session.ts` pairs with `docs/design-docs/auth-session.md` if one exists)
   - explicit `source_docs:` backrefs from skills
2. For each pair, evaluate with a narrow LLM prompt:
   > Does this diff contradict any principle stated in this doc? Reply on two lines: `drift: yes` or `drift: no`, then one sentence of reasoning.
3. Append `yes` findings to `docs/generated/drift-report.md` with the commit SHA, doc path, and the one-sentence reasoning.
4. Do not auto-edit the doc. `audit` mode consumes the report next sweep; a human can also act immediately.

The LLM call is the agent's job — the script is a cheap, deterministic harvester.

## `lessons.md` Entry Format

```md
## YYYY-MM-DD — [short trigger phrase]
- **Mistake**: what I did
- **Correction**: what I should have done
- **Doc ref**: path/to/doc.md#anchor
- **Status**: pending | graduated(YYYY-MM-DD) | pruned(YYYY-MM-DD, reason)
```

One entry per mistake. Keep entries terse — a paragraph, not a retro.

## Graduation Rule

A lesson graduates from `lessons.md` into the skill body when either:
- it recurs (the same mistake appears twice), or
- it gets cited by `astack-compound` during a durability pass.

On graduation: copy the operative rule into the skill body, then mark the lesson entry `graduated(YYYY-MM-DD)`. Do not delete — the entry stays as provenance. Bump `verified_at`.

## Decay Rule

Lessons that stay `pending` more than 3 months get pruned or promoted at the next audit. No open-ended accumulation. If a lesson hasn't recurred or graduated in a quarter, the signal wasn't durable — drop it or fold it in, but do not let `lessons.md` become a graveyard.

## Where Things Live

| Artifact | Path | Purpose |
| --- | --- | --- |
| Per-skill lessons | `<skill>/lessons.md` | Active view layer — pending entries for this skill |
| Orphan lessons | `docs/generated/pending-lessons.md` | Lessons with no owning skill yet |
| Skill body | `<skill>/SKILL.md` | Canonical view — graduated rules live here |
| Source docs | `docs/**/*.md` | Source of truth — skills materialize from these |
| Drift report | `docs/generated/drift-report.md` | Harvest output; audit input |
| Audit plan | `docs/exec-plans/active/YYYY-MM-DD-skill-audit.md` | Curation proposals |

## Related Skills

- `astack-compound` — post-success capture of standing rules, architecture notes, doc updates. Use it when the work went well and produced durable insight. This skill (`astack-skills`) is the mirror: used when the work went wrong or on a scheduled sweep.
- `astack-docs` — structure and linting of the `docs/` tree. `astack-skills` writes into `docs/generated/` and `docs/exec-plans/active/`; those paths must stay on the allowlist.
- `astack-cleanup` — non-doc structural drift (overlapping skills, runtime config, dead entrypoints). Overlapping *skills* specifically can be surfaced here via `merge` proposals, then cleaned up there.

## Closeout

- State which mode ran (`mistake` / `audit` / `drift`).
- State which files were written (`lessons.md`, `drift-report.md`, audit plan).
- If a lesson graduated, state the skill body change and the new `verified_at` date.
- If nothing was durable enough to record, say so explicitly.

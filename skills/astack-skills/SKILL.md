---
name: astack-skills
description: "Use sparingly to maintain the skill layer itself — graduate recurring lessons into skill bodies, prune stale lessons, or fix skill trigger text. `astack-compound` owns the default recent-commit look-back."
---

# astack-skills

Back-office maintenance for the skill layer. This is not the default "check what changed" pass; `astack-compound` already owns that.

## Iron Law

COMPOUND OWNS RECENT-COMMIT REVIEW. SKILLS ONLY TENDS THE VIEW LAYER.

## Use This When

- a recurring lesson should graduate into a `SKILL.md` body
- a skill description or body routed the agent wrong and needs sharpening
- a stale lesson should be pruned or archived
- a lesson has no clear owner yet and needs one

## Do Not Use This For

- reading recent commits for accidental feature removal
- generic docs sync after meaningful work
- PR preflight or merge-conflict checks
- introducing separate user-facing "drift" or "audit" jargon

## Flow

1. Classify the root cause:
   - `skill-missing` — no skill triggered for the situation. Materialize a new skill from the relevant doc.
   - `skill-wrong` — a skill triggered but its description or body led the agent astray. Sharpen the trigger or correct the body.
   - `doc-missing` — the source principle isn't written down anywhere. Update the doc first, then materialize.
2. Read the relevant `lessons.md`:
   - If a skill owns the territory → `<skill>/lessons.md` (per-skill).
   - If no skill owns it yet → `docs/generated/pending-lessons.md` (orphan queue).
3. If the lesson recurred or `astack-compound` cited it again, copy the operative rule into the skill body and mark the lesson `graduated(YYYY-MM-DD)`.
4. If the lesson is stale or no longer useful, prune or archive it instead of letting it accumulate forever.
5. If the rule is not skill-specific, move it to `AGENTS.md` or docs instead of bloating the skill body.

## `lessons.md` Entry Format

```md
## YYYY-MM-DD — [short trigger phrase]
- **Mistake**: what I did
- **Correction**: what I should have done
- **Doc ref**: path/to/doc.md#anchor
- **Status**: pending | graduated(YYYY-MM-DD) | pruned(YYYY-MM-DD, reason)
```

One entry per mistake. Keep entries terse — a paragraph, not a retro.

## Related Skills

- `astack-compound` — the default recent-commit look-back. Use it first; it decides whether a lesson or standing rule needs to move.
- `astack-docs` — use when the rule belongs in docs, not the skill body.
- `astack-cleanup` — use when multiple skills overlap and should be merged or retired structurally.

## Closeout

- State which skill was updated or pruned
- State which `lessons.md` entries changed
- If a lesson graduated, state the skill body change
- If nothing durable changed, say so explicitly

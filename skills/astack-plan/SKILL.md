---
name: astack-plan
description: "Use BEFORE implementation when the task is MEDIUM or LARGE. Turn clear requirements into a sequenced plan with files, verification, and rollback. Required before astack-work for anything that isn't SMALL. No code edits during this skill."
---

# astack-plan

Plan-only. Never edit code while in this skill.

## Iron Law

NO PLAN WITHOUT VERIFIED CONSTRAINTS. READ THE CODE BEFORE WRITING STEPS.

## Right-Size

Skip this skill when:
- change is SMALL (single file / single function / obvious fix)
- no migration, rollout, or rollback concerns
- no open questions the user hasn't already answered
- a short inline checklist in chat is enough

Go straight to `astack-work` in those cases. Come back if scope grows.

## Default Rules

- Do not edit code
- Keep the plan proportional to the work — a medium task does not need a large-change section
- If the user did not ask for a deep spec, confirm scope before expanding

## Plan Shape

1. Goal and non-goals
2. Constraints from the repo and runtime (cite the files you read)
3. Relevant files and systems
4. Proposed approach
5. Ordered implementation steps
6. Verification plan (what will be run, where)
7. Risks, migration, rollback
8. Open questions

## Durable Output

When the plan is substantial enough to survive the session, write it to:

```
docs/exec-plans/active/YYYY-MM-DD-<slug>.md
```

with YAML frontmatter (`status`, `updated`, `folders`). If the plan encodes an architectural decision, write or update `docs/design-docs/<slug>.md` too. When work finishes, move the plan to `docs/exec-plans/completed/`.

Do not invent ad-hoc plan paths. The allowlist is the contract.

## Red Flags

| Rationalization | Reality |
| --- | --- |
| "I'll figure constraints out as I code" | That's how plans ship with wrong assumptions. Read first. |
| "It's basically just a rename" | Big renames are large changes. Plan them. |
| "The user didn't ask for rollback" | Ask. One sentence beats a silent regression. |

## Handoff

- Plan accepted, ready to build → `astack-work`
- Requirements still fuzzy → back to `astack-brainstorm`
- Plan encodes durable learning → `astack-compound`

---
name: astack
description: "Use at the start of ANY coding task — sizes the task, routes to the right workflow skill, and blocks code execution until the user is on the right track. Invoke BEFORE any response including clarifying questions. If you think there is even a 1% chance this skill applies, invoke it."
---

<EXTREMELY-IMPORTANT>
If there is even a 1% chance astack applies to the current task, you MUST invoke it before any response. Not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

# astack

The astack meta-skill. Pick the right workflow for the task, announce the pick, let the user override with one word.

## The 1% Rule

If unsure whether a workflow is needed, run one. Simple questions are tasks. Clarifying questions are tasks. "Just a rename" is a task. Sizing takes one paragraph — skipping it costs more than doing it.

## Task Sizing

Classify every request into one of three sizes:

| Size | Signals | Default route |
|---|---|---|
| SMALL | single file / single function, clear requirement, obvious bug / typo / rename, change is ≤ 50 LOC | `astack-work` directly |
| MEDIUM | multiple files, minor architectural choice, new pattern in familiar tech, fuzzy edges | `astack-plan` first, then `astack-work` |
| LARGE | new subsystem, schema or API change, cross-module refactor, multi-day work, unclear scope | `astack-brainstorm` → `astack-plan` → `astack-work` |

When the signals disagree, pick the smaller size. Ceremony on small work is worse than skipping it on large work — the user can always escalate with one word.

## The Default on Ambiguity

If you truly cannot tell the size (one-sentence user message, no context, new repo), default to **SMALL**. Announce the guess. Let the user redirect.

## Context Recovery

Before sizing, scan fast for existing context: an active plan under `docs/exec-plans/active/`, a recent design doc, an open TODO in the current file, a pinned note in the nearest `AGENTS.md`. If the task is already mid-flight, rejoin that thread instead of starting a new one.

## Announce Pattern

Every astack session starts with:

```
Sizing: <SIZE> — <one-sentence rationale citing concrete signals>.
Route: <skill or chain>.
Escape: "plan it" / "brainstorm it" / "just do it" to redirect.
```

Keep it one block. Do NOT ask the user a question at this point — silent consent is fine.

## Routing Guide

- `astack-brainstorm` — open-ended shaping, new product surface, before-code ideation
- `astack-plan` — turn a clear requirement into a design + sequence
- `astack-work` — implementation or debugging when the task is clear
- `astack-review` — read-only review of code, docs, or plans
- `astack-qa` — runtime validation, bug repro, rubric grading
- `astack-ship` — commit, push, PR, deploy
- `astack-cleanup` — non-doc structure drift (skills, runtime config, entrypoints)
- `astack-compound` — distill durable knowledge after meaningful work
- `astack-docs` — init / migrate / lint the docs tree

## Red Flags

When you notice these thoughts, you are rationalizing around astack:

| Thought | Reality |
|---|---|
| "This is just a simple question" | Questions are tasks. Check sizing. |
| "I need more context first" | Size first, then gather. |
| "I'll just do this one thing" | Pick a route. Announce it. Then do. |
| "This feels productive" | Undisciplined action wastes the user's time. Size first. |
| "The user wants a quick answer" | Announcing the route is the quick answer. |
| "The workflow is overkill" | SMALL is zero-ceremony. If it feels overkill, size might be wrong. |

## User Overrides

If the user says any of these, reroute without argument:

- `"just do it"` / `"skip the plan"` → jump to `astack-work`, SMALL
- `"plan it"` / `"plan first"` → force `astack-plan`, MEDIUM
- `"brainstorm it"` / `"let's think"` → force `astack-brainstorm`, LARGE
- `"no ceremony"` / `"small change"` → lock SMALL
- `"this is big"` / `"architecture"` → lock LARGE

User overrides beat heuristics every time.

## Doc Output Alignment

When downstream skills produce durable docs, they write to the astack-docs layout:

- `astack-brainstorm` / `astack-plan` architectural output → `docs/design-docs/<slug>.md` (with `folders:` frontmatter)
- `astack-plan` implementation output → `docs/exec-plans/active/YYYY-MM-DD-<slug>.md`
- `astack-compound` durable insights → the right home per its own routing

Never write plans or design docs outside this structure.

## Handoff

After sizing + announcing + optionally routing, the invoked skill runs its own workflow. Return to `astack` only if the user redirects or the task morphs mid-flight.

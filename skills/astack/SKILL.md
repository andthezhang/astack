---
name: astack
description: "Use at the start of ANY coding task — sizes the task, routes to the right workflow skill or mode, and blocks code execution until the user is on the right track. Invoke BEFORE any response including clarifying questions. If you think there is even a 1% chance this skill applies, invoke it."
---

<EXTREMELY-IMPORTANT>
If there is even a 1% chance astack applies to the current task, you MUST invoke it before any response. Not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

# astack

The astack meta-skill. Pick the right workflow or mode for the task, announce the pick, let the user override with one phrase.

## The 1% Rule

If unsure whether a workflow is needed, run one. Simple questions are tasks. Clarifying questions are tasks. "Just a rename" is a task. Sizing takes one paragraph — skipping it costs more than doing it.

## Task Sizing

Classify every request into one of three sizes:

| Size | Signals | Default route |
|---|---|---|
| SMALL | single file / single function, clear requirement, obvious bug / typo / rename, change is ≤ 50 LOC | `astack-work` directly |
| MEDIUM | multiple files, minor architectural choice, new pattern in familiar tech, fuzzy edges | `astack-brainstorm` brief, then `astack-work` |
| LARGE | new subsystem, schema or API change, cross-module refactor, multi-day work, unclear scope | `astack-brainstorm` with docs, then `astack-work` |

When the signals disagree, pick the smaller size. Ceremony on small work is worse than skipping it on large work — the user can always escalate with one word.

## The Default on Ambiguity

If you truly cannot tell the size (one-sentence user message, no context, new repo), default to **SMALL**. Announce the guess. Let the user redirect.

## Context Recovery

Before sizing, scan fast for existing context: `CONTEXT-MAP.md`, the relevant `CONTEXT.md`, `docs/architecture/ARCHITECTURE.md`, recent files under `docs/architecture/decisions/`, agent config under `docs/agents/`, an open local issue under `docs/issues/` if that backend exists, an open TODO in the current file, or a pinned note in the nearest `AGENTS.md`. If the task is already mid-flight, rejoin that thread instead of starting a new one.

## Announce Pattern

Every astack session starts with:

```
Sizing: <SIZE> — <one-sentence rationale citing concrete signals>.
Route: <skill or chain>.
Escape: "brainstorm it" / "review architecture" / "just do it" to redirect.
```

Keep it one block. Do NOT ask the user a question at this point — silent consent is fine.

## Routing Guide

- `astack-brainstorm` — open-ended shaping, new product surface, before-code ideation
- `astack-work` — implementation or debugging when the task is clear
- `astack-review` — read-only review of code, docs, or plans
- `astack-review` Architecture Review mode — surface deepening opportunities, shallow modules, overloaded interfaces, weak locality, and testability problems
- `astack-qa` — runtime validation, bug repro, rubric grading
- `astack-ship` — commit, push, PR, deploy
- `astack-cleanup` — non-doc structure drift (skills, runtime config, entrypoints)
- `astack-compound` — distill durable knowledge after meaningful work
- `astack-docs` — init / migrate / lint the repo knowledge contract

Matt-style motions are modes, not new top-level skills:

- Grill with docs → `astack-brainstorm`
- Improve codebase architecture → `astack-review` Architecture Review mode

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
- `"plan it"` / `"plan first"` → force `astack-brainstorm` brief, MEDIUM
- `"brainstorm it"` / `"let's think"` → force `astack-brainstorm`, LARGE
- `"review architecture"` / `"improve architecture"` → force `astack-review` Architecture Review mode
- `"no ceremony"` / `"small change"` → lock SMALL
- `"this is big"` / `"architecture"` → lock LARGE

User overrides beat heuristics every time.

## Doc Output Alignment

When downstream skills produce durable docs, they write to the astack-docs knowledge contract:

- Domain language resolved during brainstorming → the relevant `CONTEXT.md`
- Path-to-context routing changes → `CONTEXT-MAP.md`
- Current implemented architecture → `docs/architecture/ARCHITECTURE.md` with Mermaid embedded directly
- Architectural decision history → `docs/architecture/decisions/<slug>.md` with implementation state
- Issue tracker/status mapping → `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`
- Local-file issue output, only when configured → `docs/issues/active/<slug>.md`
- `astack-compound` durable insights → the right home per its own routing

Never write durable plans, architecture notes, or decision history outside this structure.

## Handoff

After sizing + announcing + optionally routing, the invoked skill runs its own workflow. Return to `astack` only if the user redirects or the task morphs mid-flight.

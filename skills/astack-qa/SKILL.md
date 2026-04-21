---
name: astack-qa
description: "Use to test user flows, validate behavior, and grade the result against an explicit rubric. Use BEFORE or AFTER implementation for bug reproduction, exploratory testing, dogfooding, browser/device checks, regression validation, or pre-release evaluation. Report-first; the rubric score is written BEFORE any fix is applied, then frozen."
---

# astack-qa

For validation, bug hunting, and pre-release evaluation. Two defaults:

1. **Report-first** — produce findings before changing code
2. **Grade-before-fix** — write the rubric score before touching anything, so later passes don't self-launder a mediocre result

## Iron Law

SCORE BEFORE FIX. THE RUBRIC IS FROZEN ONCE WRITTEN.

## Right-Size

Skip this skill when:
- the bug is already reproduced and the fix is obvious — go to `astack-work`
- there's nothing running to test (no app, no failing test) — fix the bootstrap first
- the user wants a code audit, not behavior validation — go to `astack-review`
- the request is "ship it" with checks already green — go to `astack-ship`

## Test Shape

Favor the smaller, faster layer when it's enough:

- **Unit** — per-module correctness, no network, no filesystem; most coverage lives here
- **Integration** — modules exercised together with real dependencies where practical; catches the wiring mistakes unit tests miss
- **E2E** — only for critical journeys (sign-in, checkout, core create/read); not a substitute for unit + integration

If the repo has no tests, bootstrap unit and integration before reaching for E2E.

## Tools

Match the tool to the layer. Use what the repo already has — do not assume a specific path or binary.

- **Web UI** — agent-browser or Playwright
- **Mobile UI** — agent-device
- **API / backend** — the repo's existing HTTP or RPC test harness
- **Database / migrations** — the repo's migration runner against a throwaway database

When driving a real app: snapshot, act, snapshot, compare.

## Rubric (score BEFORE fixing)

Score each 1–5. Evaluator and fixer are separate passes.

1. **Functionality** — does it do what the spec or request says, end-to-end?
2. **Craft** — loading states, error paths, edge cases, no dead clicks, no silent failures
3. **Design** — matches `docs/DESIGN.md` or the project's system (spacing, hierarchy, color, type)
4. **Originality / product quality** — does it actually solve the user's job, or is it a placeholder that technically works?

Scoring:
- 5: no meaningful issues
- 4: minor gaps, not blockers
- 3: real gaps an attentive reviewer would flag
- 2: failing a core expectation
- 1: blocker / unusable

Any dimension below 3 is a blocker. Weight functionality and originality higher than craft and design when ratings disagree — a polished feature solving the wrong problem is worse than an ugly feature solving the right one.

## QA Flow

1. Define environment and entry path
2. Reproduce or explore the target flow
3. Capture evidence (screenshots, logs, network traces, test output)
4. Separate confirmed bugs from guesses
5. Write the rubric score with one-line justification per dimension
6. Report issues with clear repro steps

## Per-Issue Output

1. Title
2. Severity (blocker / major / minor / cosmetic)
3. Steps to reproduce
4. Expected result
5. Actual result
6. Evidence or artifact path

## Handoffs

- Fixes after QA → `astack-work`. The rubric stays frozen; fixes are measured against it.
- Durable test pattern or guard emerged → `astack-compound`
- Bugs cluster around doc drift → `astack-docs`

---
name: astack-work
description: "Use for implementation, debugging, or execution of a clear plan. Routes into a sub-mode based on what's happening: standard implementation, bug investigation, TDD, parallel subagents, or worktrees. Invoke only after sizing is clear via astack."
---

# astack-work

Execute the task. The task is clear enough to act on.

## Iron Law

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION OUTPUT.**
If you haven't run the verification command in this message, you cannot claim it passes.

## Right-Size

Use this skill when:
- requirements are clear (user's intent is obvious, or a plan exists)
- the task is sized SMALL or MEDIUM, OR the LARGE task has an approved design

Skip / defer when:
- requirements fuzzy → go back to `astack-brainstorm`
- needs sequencing → `astack-plan`
- just reviewing, no code changes → `astack-review`
- running tests against the product for bug hunting → `astack-qa`

## Modes

Pick exactly one. Announce which mode you're in at the start of the work.

### Mode: Implementation (default)

Straightforward code change. No bug to chase, no test-first discipline required.

- Read the code around the change first
- Prefer existing patterns over new abstractions
- Keep the change small, explicit, easy to verify
- Stay within scope — resist scope creep even when tempted
- Add tests in proportion to risk

### Mode: Debugging

**Iron Law for this mode: NO FIXES WITHOUT ROOT CAUSE.**

Random patches waste time and create new bugs. Before proposing any fix:

1. **Reproduce** — minimal steps that trigger the bug every time
2. **Isolate** — narrow to the smallest failing unit
3. **Name the cause** — one sentence that would predict the bug if repeated
4. **Propose the fix** — only after the cause is named, not before

If you haven't completed steps 1–3, you cannot propose a fix. Symptom patches are failure.

Applies to: any bug, test failure, unexpected behavior, performance problem.

### Mode: TDD

**Iron Law for this mode: IF YOU DIDN'T WATCH THE TEST FAIL, YOU DON'T KNOW IT TESTS THE RIGHT THING.**

When to use:
- new features where behavior can be expressed as a test
- bug fixes where a regression test should land with the fix
- behavior changes in well-tested code

Exceptions (ask first):
- throwaway prototypes
- generated code
- configuration files
- UI work where the "test" is visual

Flow: write the test → watch it fail → write minimum code to pass → refactor → confirm still green. Do not skip the fail step. "I know what it will do" is not watching it fail.

### Mode: Parallel Subagents

When the task has multiple *independent* sub-tasks — no shared files, no order dependencies — dispatch subagents, one per sub-task. Each subagent runs in its own context with a specific prompt.

Rules:
- Independence test: could these sub-tasks be given to different engineers on different days without coordination? If no, they're not independent — don't parallelize.
- Give each subagent a self-contained prompt. They can't see conversation history.
- If two subagents will touch the same files, serialize instead. Avoid merge conflicts up-front.
- Require each subagent to commit its own work before reporting done. Harder to lose work that way.

### Mode: Worktrees

When juggling multiple branches concurrently (reviewing one branch while coding another, handing off to a parallel agent, protecting main from experimental changes):

- One worktree per active branch
- Each worktree gets its own context — don't cross-pollinate state
- Clean up completed worktrees (orphan worktrees rot)

## Working Style (all modes)

- Read the nearest `AGENTS.md` first
- Read the code before deciding how to change it
- One commit per logical change
- Don't batch unrelated work in a single commit

## Red Flags

Catch yourself on these and re-route:

| Thought | Reality |
|---|---|
| "This is taking too long, let me just patch it" | Bug mode: root cause first. |
| "I'll skip the test, it's obvious" | TDD mode: write the test. Obvious bugs are what tests are for. |
| "These subagents can share this helper file" | Not independent — don't parallelize. |
| "I'll commit this and the other thing together" | No. One logical change per commit. |
| "The tests will pass, I don't need to run them" | Iron Law. Run them. |

## Closeout

Before declaring done:

1. Run the verification command(s) fresh, in this session
2. Paste the output or cite the file:line of the evidence
3. State what was changed, what was tested, what still has residual risk
4. If the change is durable / architectural, consider following with `astack-compound`

## Handoff

- Tests pass, code is ready → `astack-ship`
- Need extra review → `astack-review` (code) or `astack-qa` (runtime)
- Bug surfaced unexpectedly → stay in this skill, switch to Debugging mode
- Discovered the task is bigger than sized → back to `astack` for re-sizing

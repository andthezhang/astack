---
name: astack-ship
description: "Use to prepare completed work for delivery — commit, push, PR, release, or deploy. Runs a preflight, keeps unrelated diff out, verifies BEFORE claiming ship-ready. Every ship claim MUST cite fresh verification output."
---

# astack-ship

Use after implementation or review when the user wants to ship. Never claim shipped without receipts.

## Iron Law

NO SHIP CLAIMS WITHOUT FRESH VERIFICATION OUTPUT.

## Right-Size

Skip this skill when:
- the change is uncommitted scratch work the user wants to keep exploring
- the user wants a review first — go to `astack-review`
- the feature still has known bugs — go to `astack-qa` or `astack-work`
- this is a WIP commit inside a longer session — just commit, no ship flow

Use when the user says "ship", "push", "deploy", "PR", or "land".

## Default Rules

1. Inspect the current git state first (`git status`, `git diff`, branch)
2. Keep unrelated changes out of the ship path — stage only what belongs
3. If the branch is headed to a PR or you recently refreshed from the target branch, run the suspicious-commit detector across the compare range before shipping
4. Run the relevant checks for the requested level of confidence
5. Be explicit about what shipped, what was only tested locally, and what still needs validation

## Ship Flow

1. Confirm the intended diff with the user
2. If sync with the target branch introduces conflicts, treat the target branch as the baseline. Reapply only the intended branch change. If the resolution would drop remote behavior or you cannot explain it, stop and ask a human.
3. Run targeted verification (tests, typecheck, lint — whatever the repo uses)
4. Commit with a clear value-focused message
5. Push or open a PR if requested
6. Deploy or release only if requested
7. Record the verification output in the ship summary

## Verification Receipts

A ship summary that says "tests passed" without the command and result is not a receipt. Include:

- exact command run
- exit status or summary line
- anything skipped and why

If verification could not run (no test harness, flaky infra), say so plainly. Do not fake green.

## Output

Summarize:

1. Exact actions taken (commits, pushes, PR URL, deploy target)
2. Verification run with receipts
3. Any follow-up the user should know about (unpushed branches, skipped checks, deferred work)

## Red Flags

| Rationalization | Reality |
| --- | --- |
| "Tests probably still pass" | Run them. Probably is not a receipt. |
| "I'll bundle the unrelated fix in" | No. Unrelated changes leave the ship path. |
| "The merge conflict is small, I'll just make it compile" | Compiling is not the bar. Preserve remote behavior or ask a human. |
| "CI will catch it" | CI catches regressions; you catch "I forgot to save". Run locally first. |

## Handoff

- Ship uncovered debt or learning → `astack-compound`
- PR gets review feedback requiring fixes → `astack-work`

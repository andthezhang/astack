---
name: astack-review
description: "Use for read-only review of code, docs, or plans. Produces findings ordered by severity, never edits. Every finding MUST cite file:line evidence. Use when the user asks for a review, audit, or second pass."
---

# astack-review

Read-only. No edits. Ever.

## Iron Law

EVIDENCE BEFORE CLAIMS. CITE FILE:LINE OR DON'T ASSERT.

## Right-Size

Skip this skill when:
- the user wants a fix, not a review — go to `astack-work`
- the artifact is a plan the user wants rewritten — go to `astack-plan`
- the scope is a one-line diff with no subtlety — just comment inline, no formal review
- the user only wants a QA pass on a running app — go to `astack-qa`

Use review when there's something concrete (code, plan, doc) to read and the user wants findings surfaced without changes.

## Review Contract

- Do not edit files
- Lead with findings, not summary
- Order findings by severity (blocker → major → minor → nit)
- Ground every claim in file:line evidence
- Distinguish confirmed bugs from suspected ones

## What to Look For

- Correctness bugs
- Regressions and broken user flows
- Data loss or migration risk
- Security, auth, or trust-boundary mistakes
- Missing or weak verification
- Plan or doc inconsistencies with code
- Dead code, unused branches, silent failures

## Per-Finding Shape

1. Severity
2. Title
3. `path/to/file.ext:LINE` reference
4. What's wrong + why it matters
5. Suggested direction (not a full patch)

## Output Shape

1. Findings first, by severity
2. Open questions or assumptions the review made
3. Brief change summary at the end

If there are no material issues, say so clearly and note residual risk or test gaps.

## Red Flags

| Rationalization | Reality |
| --- | --- |
| "Looks fine to me" with no citations | That's not a review. Cite or don't assert. |
| "I'll just fix this one thing" | No. Review is read-only. Switch skills. |

## Handoff

- User wants findings fixed → `astack-work`
- Review produced a durable pattern → `astack-compound`
- Findings cluster around doc drift → `astack-docs`

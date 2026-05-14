---
name: astack-review
description: "Use for read-only review of code, docs, work artifacts, or architecture. Includes Architecture Review mode for refactors and boundary work. Every finding MUST cite file:line evidence."
---

# astack-review

Read-only. No edits. Ever.

## Iron Law

EVIDENCE BEFORE CLAIMS. CITE FILE:LINE OR DON'T ASSERT.

## Right-Size

Skip this skill when:
- the user wants a fix, not a review — go to `astack-work`
- the artifact is fuzzy and needs shaping — go to `astack-brainstorm`
- the scope is a one-line diff with no subtlety — just comment inline, no formal review
- the user only wants a QA pass on a running app — go to `astack-qa`

Use review when there's something concrete (code, issue, work artifact, doc) to read and the user wants findings surfaced without changes.

## Modes

Pick the mode explicitly.

### Mode: Standard Review

Use for ordinary code, doc, issue, PR, or work artifact review. Focus on correctness, regressions, risk, and verification gaps.

### Mode: Architecture Review

Use before architecture refactors, boundary cleanup, module split/merge work, interface redesign, or when the user asks whether the codebase shape is healthy.

Read first:

- nearest `AGENTS.md`
- `CONTEXT.md` and `CONTEXT-MAP.md` when present
- `docs/architecture/ARCHITECTURE.md` and root `ARCHITECTURE.md` when present
- relevant architecture decisions in `docs/architecture/decisions/`; read old decision material under `docs/_legacy/` only when migration context matters
- the code paths under review, including tests and call sites

Surface:

- shallow modules that only pass data through or rename concepts
- weak interfaces that leak implementation detail or force unrelated callers to know too much
- missing seams where future changes require touching too many places
- poor locality where related behavior is scattered across distant modules
- weak test surfaces that make architecture changes hard to verify

This mode is still read-only. It produces findings and recommended direction, not a patch or task sequence.

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
- Work artifact or doc inconsistencies with code
- Dead code, unused branches, silent failures
- Architecture drift from documented context or decisions
- Shallow abstractions, weak interfaces, missing seams, poor locality, and weak test surfaces

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

For Architecture Review, use the same findings-first shape. Add a short "Architecture Direction" section after findings only if it helps connect the cited findings into one recommended direction.

## Red Flags

| Rationalization | Reality |
| --- | --- |
| "Looks fine to me" with no citations | That's not a review. Cite or don't assert. |
| "I'll just fix this one thing" | No. Review is read-only. Switch skills. |

## Handoff

- User wants findings fixed → `astack-work`
- Review produced a durable pattern → `astack-compound`
- Findings cluster around doc drift → `astack-docs`
- Findings show the idea itself needs reshaping → `astack-brainstorm`

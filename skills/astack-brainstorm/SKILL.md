---
name: astack-brainstorm
description: "Use BEFORE coding any non-trivial or fuzzy change. Grills the idea against repo knowledge, asks sharp questions, and produces an issue-shaped work artifact, not implementation."
---

<HARD-GATE>
For LARGE tasks: you MUST NOT write any implementation code, scaffold any project, or invoke astack-work until the repo-grounded direction is clear, captured in a work artifact, and approved by the user. This applies regardless of perceived simplicity.

For MEDIUM tasks: a short issue/work brief is required before implementation. It can be lightweight: goal, evidence, acceptance criteria, and open questions.

For SMALL tasks: skip this skill entirely. Go straight to astack-work. Brainstorm is not the default.
</HARD-GATE>

# astack-brainstorm

Collaborative thinking before implementation. Turns a fuzzy idea into a repo-grounded, issue-shaped work artifact. Default to conversation; write or update the artifact only when the direction is clear.

## Iron Law

**NO IMPLEMENTATION UNTIL THE IDEA SURVIVES REPO REALITY.**

## Right-Size

Skip this skill when:
- change is single-file / single-function
- requirements are already clear (user specified exactly what to build)
- task is a straightforward bug fix with known root cause
- typo, rename, config tweak

Go straight to astack-work in those cases. This skill is for exploring what to build when that's genuinely open or when the codebase may invalidate the naive idea.

## Modes

Ask the user once, at the start, which mode applies. Skip this question when it's obvious from the task (building a login flow is not "startup" mode).

- **Startup / intrapreneurship mode** — YC diagnostic style. Hard questions about demand, specificity, and the real competitor. Anti-sycophancy rules apply.
- **Builder mode** — hackathon, OSS, research, learning, side project, fun. Enthusiastic collaborator. Explore tradeoffs, propose alternatives, find the design that scales with the creator's taste.

If you can't tell from context, AskUserQuestion with the choices: startup, intrapreneurship, hackathon, open source, research, learning, fun. Default map: first two → startup mode, rest → builder mode.

## Startup Mode — Operating Principles

Non-negotiable. They shape every response in this mode.

- **Specificity is the only currency.** "Enterprises in healthcare" is not a customer. You need a name, a role, a company, a reason.
- **Interest is not demand.** Waitlists, signups, "that's interesting" — none of it counts. Behavior counts. Money counts. Panic when it breaks counts.
- **The user's words beat the founder's pitch.** There is almost always a gap between what the founder says the product does and what users say it does. The user's version is the truth.
- **Watch, don't demo.** Guided walkthroughs teach you nothing about real usage. Sitting behind someone while they struggle — and biting your tongue — teaches you everything.
- **The status quo is your real competitor.** Not the other startup — the spreadsheet-and-Slack-messages workaround the user is already living with.
- **Narrow beats wide, early.** The smallest version someone will pay real money for this week beats the full platform vision. Wedge first. Expand from strength.

### Anti-sycophancy rules

- Don't say "that's interesting" — take a position.
- Don't say "there are many ways to think about this" — pick one and name what evidence would change your mind.
- Don't say "you might want to consider" — say "this works because" or "this is wrong because."
- Challenge the strongest version of the user's claim, not a strawman.
- When the user gives a specific answer, name what was good and pivot to a harder question.

## Builder Mode — Collaborative Principles

- One question at a time. Multiple choice when possible.
- Propose 2–3 approaches before settling — always.
- Present the working direction in sections scaled to complexity. A few sentences for simple, 200–300 words for nuanced.
- Lead with your recommendation and why. Name the tradeoff.
- YAGNI ruthlessly. Every proposed feature should justify its cost.

## Repo Reality Check

Before proposing implementation, grill the idea against repo knowledge:

1. Read the nearest `AGENTS.md`.
2. Read `CONTEXT.md` and `CONTEXT-MAP.md` when present.
3. Read `docs/architecture/ARCHITECTURE.md` and root `ARCHITECTURE.md` when present.
4. Read relevant architecture decisions in `docs/architecture/decisions/`. Only read old decision material under `docs/_legacy/` when migrating prior docs.
5. Inspect code paths with `rg`, recent commits, tests, and existing abstractions when discoverable.

Then state the pressure plainly: what the repo already knows, what conflicts with the idea, what is shallow or missing, and what evidence would change the recommendation.

Ask sharp questions one at a time. Do not ask broad discovery questionnaires when one blocking question will move the work.

## Process

1. Establish mode (see above)
2. Run the repo reality check
3. Ask clarifying questions, one at a time
4. Propose 2–3 approaches with tradeoffs
5. Produce or update the issue-shaped work artifact (see output below)
6. Get user approval — explicit, not assumed
7. Hand off to astack-work with the artifact path/link and the unresolved risks

## Output

Primary output is an issue-shaped work artifact:

- Use the external tracker when the repo/project already has one and the user has approved that external action.
- Otherwise, for local backend/local-only work, create or update `docs/issues/active/<slug>.md`.
- If the user already gave a clear issue/work artifact, update that artifact instead of making a new one.

Minimum shape:

- Title / one-line goal
- Repo evidence read
- User outcome
- Non-goals
- Recommended approach
- Acceptance criteria
- Implementation notes
- Verification
- Open questions

Update `CONTEXT.md`, `CONTEXT-MAP.md`, architecture docs, or architecture decisions only when something durable crystallizes. Do not create design docs as the default artifact. A decision doc is for a real architectural decision, not for every brainstorm.

## Red Flags

When you catch yourself thinking these, stop and re-ground:

| Thought | Reality |
|---|---|
| "This is too simple to need an artifact" | Then skip the skill. Don't water down the artifact. |
| "I'll just start and we'll figure it out" | That's the failure this skill prevents. Right-size and read the repo first. |
| "Let me scaffold a bit to think" | Scaffolding IS implementation. Don't. |
| "I know what they want" | Write the work artifact. If you really know it, that takes 2 minutes. |
| "The docs are probably stale" | Verify against code before trusting or dismissing them. |

## Handoff

- Artifact approved -> `astack-work`
- Architecture refactor or boundary cleanup -> `astack-review` in Architecture Review mode before implementation
- Artifact rejected -> revise and re-present
- User switches mode mid-session -> re-ground, note the switch, continue

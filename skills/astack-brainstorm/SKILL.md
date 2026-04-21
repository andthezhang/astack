---
name: astack-brainstorm
description: "Use BEFORE coding any non-trivial change. Explores user intent, demand, tradeoffs, and approach. Produces a design doc in docs/design-docs/, not code. Required for LARGE tasks, optional for MEDIUM, skip for SMALL."
---

<HARD-GATE>
For LARGE tasks: you MUST NOT write any implementation code, scaffold any project, or invoke astack-work until a design has been written and the user has approved it. This applies regardless of perceived simplicity.

For MEDIUM tasks: a short brief is required before implementation. Can be lightweight — one paragraph per section.

For SMALL tasks: skip this skill entirely. Go straight to astack-work. Brainstorm is not the default.
</HARD-GATE>

# astack-brainstorm

Collaborative thinking before implementation. Turns a fuzzy idea into an approved design doc. Default to conversation; produce the artifact only when the direction is clear.

## Iron Law

**NO IMPLEMENTATION WITHOUT AN APPROVED DESIGN.**

## Right-Size

Skip this skill when:
- change is single-file / single-function
- requirements are already clear (user specified exactly what to build)
- task is a straightforward bug fix with known root cause
- typo, rename, config tweak

Go straight to astack-work in those cases. This skill is for exploring what to build when that's genuinely open.

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
- Present design in sections scaled to complexity. A few sentences for simple, 200–300 words for nuanced.
- Lead with your recommendation and why. Name the tradeoff.
- YAGNI ruthlessly. Every proposed feature should justify its cost.

## Process

1. Establish mode (see above)
2. Understand context — read the repo briefly, recent commits, relevant docs
3. Ask clarifying questions, one at a time
4. Propose 2–3 approaches with tradeoffs
5. Write the design doc (see output below)
6. Get user approval — explicit, not assumed
7. Hand off to astack-plan (if sequencing is needed) or astack-work (if the design is its own execution instruction)

## Output

Design docs go to: `docs/design-docs/<slug>.md` per the astack-docs layout. Include YAML frontmatter:

    ---
    status: draft
    updated: YYYY-MM-DD
    folders: [<folders-or-all>]
    ---

Structure the doc in sections scaled to complexity. Do not invent sections for the sake of having them. Typical shape: problem, constraints, approaches considered, recommendation, open questions.

## Red Flags

When you catch yourself thinking these, stop and re-ground:

| Thought | Reality |
|---|---|
| "This is too simple to need a design" | Then skip the skill. Don't water down the design. |
| "I'll just start and we'll figure it out" | That's the failure this skill prevents. Right-size first. |
| "Let me scaffold a bit to think" | Scaffolding IS implementation. Don't. |
| "I know what they want" | Write the design. If you really know it, that takes 2 minutes. |

## Handoff

- Design approved → `astack-plan` (if sequencing needed) or `astack-work` (if the design is small enough to execute directly)
- Design rejected → revise and re-present
- User switches mode mid-session → re-ground, note the switch, continue

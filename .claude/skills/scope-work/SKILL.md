---
name: scope-work
description: Use when scoping a feature, bugfix, or body of work into a GitHub issue. This skill should be used when the user provides a file path to a spec, a description of work, or says "scope this", "cut a ticket", "create an issue for", or "scope work". Analyzes the codebase dynamically to ensure the resulting issue describes an end-to-end change that can be tested and verified before committing.
disable-model-invocation: true
---

# Scope Work

Create a GitHub issue that fully describes an end-to-end, testable change. The issue serves as a contract an agent can pick up and implement to completion — no ambiguity, no missing layers.

**Announce at start:** "I'm using the scope-work skill to analyze this and cut a complete ticket."

## Step 1: Parse Input

`$ARGUMENTS` is either a file path or a freeform description.

- **File path**: Read the file to extract the raw requirements/spec.
- **Description**: Use the text directly as the raw requirements.
- **No arguments**: Ask the user what work they want scoped.

Summarize what was understood from the input in 2-3 sentences before proceeding.

## Step 2: Analyze the Codebase

Dynamically explore the repository to build a mental model of the architecture. Read `CLAUDE.md` for documented architecture, then verify by exploring:

1. **Layers**: Identify every architectural layer (pages, components, hooks, data helpers, utilities, seed data, styles, tests, config).
2. **Patterns**: Note conventions — file naming, export patterns, test structure, CSS approach.
3. **Data model**: Understand the data flow relevant to the requested change.
4. **Existing tests**: Find the test directory structure and existing test files to understand coverage patterns.

## Step 3: Determine Affected Layers

For the requested change, trace through every layer and determine what needs to happen for the change to be **complete and testable**. Ask for each layer:

- Does this layer need a **new file**?
- Does this layer need **modifications** to an existing file? Which one?
- Does this layer need **no changes**? (Explicitly note this — confirming a layer is unaffected is part of completeness.)

Build a change map:

```
Layer              | Action          | File(s)                    | Why
-------------------|-----------------|----------------------------|---------------------------
pages/             | modify          | BallotPage.jsx             | Add reset button UI
firebase/          | new function    | parties.js                 | resetScores() helper
hooks/             | no change       | —                          | Existing hooks sufficient
components/        | new component   | ResetButton.jsx            | Reusable confirmation UI
utils/             | no change       | —                          | No scoring logic changes
tests/             | new test        | resetScores.test.js        | Verify firebase helper
theme/             | no change       | —                          | Uses existing button styles
```

### Completeness Checks

After building the change map, verify:

- [ ] **Every new function has a corresponding test** — no untested code ships.
- [ ] **UI changes have a way to verify them** — either a test or explicit manual verification steps.
- [ ] **Data model changes are traced end-to-end** — from Firestore schema through hooks to UI.
- [ ] **No orphaned changes** — every modification is consumed somewhere visible.
- [ ] **Rollback is safe** — the change doesn't break existing behavior if partially applied (or note if it requires atomic deployment).

If any check fails, add the missing work to the change map before proceeding.

## Step 4: Define Success Criteria

Write concrete, verifiable success criteria. Each criterion must be something an agent can **run a command or observe a result** to confirm:

**Good criteria:**
- `npx vitest run src/firebase/__tests__/resetScores.test.js` passes with all assertions green.
- `npm run build` completes with exit code 0.
- `npm run lint` reports no new errors.
- The reset button appears on the Ballot page when host mode is active.
- Clicking reset clears all guest scores to 0 in Firestore.

**Bad criteria:**
- "The feature works correctly" (vague, untestable)
- "Code is clean" (subjective)

## Step 5: Identify Implementation Approaches

When there are meaningful design choices, describe 2-3 approaches with trade-offs. Focus on decisions that affect:

- Architecture (where does the logic live?)
- User experience (how does the user interact?)
- Data integrity (what happens in edge cases?)
- Testing strategy (what's easy vs. hard to test?)

If the implementation is straightforward with no real design choices, state that and skip the approaches section.

## Step 6: Recommend a Claude Model

Based on the change map, success criteria, and overall complexity, recommend which Claude model should execute this issue. The recommendation must appear in the issue body as a standalone line in the format `model: <name>` so that dispatching agents can parse it.

**Selection guidelines:**

| Model | When to use |
|-------|-------------|
| `haiku` | Routine, mechanical changes — renaming, simple CRUD, config tweaks, copy updates, single-file edits with clear instructions. Low ambiguity, no design decisions. |
| `sonnet` | Standard features and bugfixes — multi-file changes across 2-3 layers, straightforward testing, minor design choices. Most issues land here. |
| `opus` | Complex or high-stakes work — cross-cutting architectural changes, subtle correctness requirements, security-sensitive code, ambiguous specs that require judgment, or anything touching 4+ layers with intertwined logic. |

Factors to weigh:
- **Number of affected layers** — more layers = higher model
- **Ambiguity in requirements** — clear spec → lower model; judgment calls → higher model
- **Risk of subtle bugs** — data integrity, security, concurrency → higher model
- **Design decisions required** — no choices → lower model; meaningful trade-offs → higher model

## Step 7: Create the GitHub Issue

Use `gh issue create` to create the issue with the following structure:

```markdown
## Summary

[2-3 sentences describing what this change does and why]

## Change Map

| Layer | Action | File(s) | Details |
|-------|--------|---------|---------|
| ... | ... | ... | ... |

## Success Criteria

- [ ] [Concrete, verifiable criterion]
- [ ] [Another criterion]
- [ ] All existing tests continue to pass: `npx vitest run`
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint`

## Implementation Approaches

### Approach A: [Name]
[Description with trade-offs]

### Approach B: [Name]
[Description with trade-offs]

**Recommended:** [Which and why]

## Model

model: [opus|sonnet|haiku]

_[1 sentence justification for the model choice]_

## Context

- **Input**: [File path or description that triggered this]
- **Layers confirmed unaffected**: [List layers that were analyzed and don't need changes]
```

**Before creating the issue**, present the draft to the user for review. Only create after approval.

## Handling Edge Cases

- **Ambiguous input**: Ask clarifying questions before analyzing. Do not guess scope.
- **Multiple features bundled**: Recommend splitting into separate issues. Offer to scope each one.
- **Change touches untested code**: Note in the issue that existing code lacks tests and recommend adding baseline tests as part of the work.
- **Breaking change**: Flag prominently in the summary and add migration steps to the success criteria.

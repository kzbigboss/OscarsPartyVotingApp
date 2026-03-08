---
name: work-session
description: Use when starting a work session, deciding what to work on, or dispatching agents to issues. Triages open GitHub issues, lets the user pick which to tackle, assigns Claude models, checks for independence, and dispatches parallel agents in isolated worktrees.
disable-model-invocation: true
---

# Work-Session Orchestrator

## Overview

Chain issue triage, user selection, model assignment, and parallel agent dispatch into a single workflow. This skill owns the glue between existing skills and agent execution — it never implements code itself.

**Announce at start:** "I'm using the work-session skill to triage issues and dispatch agents."

**Composed skills:**

- `issue-triage` — ranks open GitHub issues by priority, staleness, and independence
- `scope-work` — creates change maps for individual issues (run by agents, not by this skill)
- CLAUDE.md § Agent Workflow — agent lifecycle (claim, implement, verify, PR, summarize)

## Critical Rules

1. **Orchestrate only.** Never write application code, modify source files, or fix bugs. Your job ends when agents are dispatched.
2. **Delegate, don't duplicate.** Issue ranking belongs to `issue-triage`. Change maps belong to `scope-work`. Call those skills — do not reimplement their logic.
3. **Visible routing.** Every model assignment decision and its reasoning must be shown to the user at the dispatch checkpoint. No silent assignments.
4. **Maximize parallelism.** Independent issues should be dispatched to separate agents running concurrently. Only flag dependencies — never serialize work that can be parallel.
5. **User has final say.** The user approves issue selection, model assignments, and the dispatch plan. Never dispatch without explicit approval.

## Process

### Step 1: Triage

Invoke the `issue-triage` skill exactly as defined. Do not modify its process or skip any of its steps.

Retain the following data from the triage output for later steps:
- The full top-5 ranked table
- The **Independence Analysis** section (file-overlap data per issue)
- Any staleness flags

### Step 2: User Selection

Present the triage table and prompt the user:

> Which issues would you like to work on? Enter comma-separated row numbers (e.g., `1, 3, 5`).

Wait for the user's response. Do not proceed until issues are selected.

### Step 3: Model Assignment

For each selected issue, determine the Claude model using this resolution order (first match wins):

1. **Issue explicit** — The issue body contains `model: opus`, `model: sonnet`, or `model: haiku` (case-insensitive search). This is **authoritative**. Use the specified model with no override and no questions.
2. **Default** — If no explicit model is found in the issue body, assign **Sonnet**.

**Escalation suggestions (non-blocking):** After assigning models, check each Sonnet-defaulted issue for escalation signals. If any of the following are true, add a note suggesting the user consider Opus — but do not change the assignment automatically:

- Issue has a `category:security` label
- Issue affects 4+ files across different architectural layers
- Issue has a `severity:critical` label

Format the suggestion as: `Note: Issue #N may benefit from Opus — [reason]. You can change this at the checkpoint.`

### Step 4: Independence Check

Using the file-overlap data retained from the triage step (Step 1), evaluate whether the selected issues can run in parallel:

- **Independent issues** — no file overlap, safe to dispatch concurrently
- **Dependent issues** — share files with another selected issue, risk merge conflicts

If dependent issues are detected, warn the user:

> Issues #X and #Y share files ([list files]). Running them in parallel may cause merge conflicts. Consider working them sequentially or picking only one.

If triage could not determine file overlap for an issue (e.g., "Needs verification" staleness), treat it as independent but note the uncertainty in the checkpoint.

Maximize parallel agents for all independent issues.

### Step 5: Dispatch Checkpoint

Present a summary table for user approval:

```
## Dispatch Plan

| Agent | Issue | Model | Warnings |
|-------|-------|-------|----------|
| 1     | #N — Title | sonnet | — |
| 2     | #M — Title | opus | Explicit in issue body |
| 3     | #P — Title | sonnet | Shares files with #N (not selected) |

### Notes
[Any escalation suggestions from Step 3]
[Any dependency warnings from Step 4]
```

Then prompt:

> Ready to dispatch? Options:
> - **y** — approve and dispatch all agents
> - **edit model assignments** — change models before dispatch (e.g., "change #N to opus")
> - **pick different issues** — go back to Step 2

Wait for explicit approval before dispatching. Do not proceed on partial or ambiguous responses.

### Step 6: Agent Dispatch

Fire all approved agents in parallel. Each agent runs in its own worktree with the assigned model.

**Isolation:** `worktree` — each agent gets an isolated git worktree to avoid conflicts.

**Branch naming:** `ISSUE-<number>/<short-slug>` (e.g., `ISSUE-42/add-reset-button`). Derive the short slug from the issue title — lowercase, hyphens, max 4 words.

**Agent prompt template:**

For each agent, provide these instructions:

```
You are working on issue #<number>: <title>
Repository: kzbigboss/OscarsPartyVotingApp
Branch: ISSUE-<number>/<short-slug>

Follow these steps in order:

1. **Claim the issue** — Comment on the GitHub issue that you're starting work:
   gh issue comment <number> --body "Starting work on this."

2. **Create the branch** — Create and check out the branch:
   git checkout -b ISSUE-<number>/<short-slug>

3. **Run scope-work** — Invoke the scope-work skill to analyze the issue and produce a change map. Use the change map to guide your implementation.

4. **Implement with TDD** — Write tests first, then implement. Follow the change map from scope-work. Commit incrementally with clear messages.

5. **Verify** — Before finishing, run all three checks:
   npx vitest run
   npm run lint
   npm run build
   All must pass with zero errors.

6. **Push and create PR** — Push the branch and open a pull request linked to the issue:
   git push -u origin ISSUE-<number>/<short-slug>
   gh pr create --title "<short description>" --body "Closes #<number>"

7. **Comment summary** — Comment on the GitHub issue with a summary of what was done, linking to the PR.
```

After dispatching all agents, this skill is complete. Agents are fully autonomous from this point. Monitor progress via:

```bash
gh pr list --repo kzbigboss/OscarsPartyVotingApp
```

Or check individual issue comments for agent status updates.

## Model Routing Reference

| Signal | Model | Override? |
|--------|-------|-----------|
| Issue body contains `model: <x>` | Specified model (opus/sonnet/haiku) | Authoritative — no override |
| No explicit model in issue body | Sonnet (default) | User can change at checkpoint |
| Escalation signal detected on Sonnet-default | Note shown suggesting Opus, not auto-applied | User decides at checkpoint |

## Common Mistakes

| Mistake | Correction |
|---------|-----------|
| Implementing code or modifying source files | This skill orchestrates only. Agents handle all code changes. |
| Overriding an explicit `model:` directive from the issue body | The issue body model directive is authoritative. Never change it. |
| Dispatching dependent issues in parallel without warning | Check file overlap from triage data. Warn the user about shared files. |
| Running scope-work yourself instead of delegating to agents | Agents run scope-work as their first step. This skill never invokes scope-work directly. |
| Skipping the dispatch checkpoint | Always present the dispatch table and wait for explicit user approval before firing agents. |
| Adding user prefixes to branch names (e.g., `markkazzaz/`) | This repo uses `ISSUE-<number>/<short-slug>` format. No user prefix needed (repo is user-owned, not org-owned). |

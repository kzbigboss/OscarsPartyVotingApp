# Work-Session Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a composing skill that chains issue-triage → user selection → model routing → parallel agent dispatch.

**Architecture:** Single SKILL.md file at `.claude/skills/work-session/SKILL.md`. No code — it's a guide document with YAML frontmatter. Delegates triage to `issue-triage`, scoping to `scope-work` (run by agents), and execution to parallel worktree-isolated agents.

**Tech Stack:** Claude Code skills (Markdown + YAML frontmatter), `gh` CLI, `git`

---

### Task 1: Create skill directory and SKILL.md with frontmatter + overview

**Files:**
- Create: `.claude/skills/work-session/SKILL.md`

**Step 1: Create the directory**

Run: `mkdir -p .claude/skills/work-session`

**Step 2: Write the YAML frontmatter and overview section**

Write the file `.claude/skills/work-session/SKILL.md` with:

```markdown
---
name: work-session
description: Use when starting a work session and want to triage open issues, assign Claude models, and dispatch parallel agents to implement them. Chains issue-triage → user selection → model routing → agent dispatch.
disable-model-invocation: true
---

# Work Session

## Overview

Orchestrate a full work session: triage open issues, let the user pick what to work on, assign the right Claude model to each, and dispatch parallel agents to implement them autonomously.

**Announce at start:** "I'm using the work-session skill to triage issues and dispatch agents."

**This skill composes:**
- `issue-triage` — ranks open issues (Step 1)
- `scope-work` — each agent runs this as its first step
- CLAUDE.md § Agent Workflow — agent lifecycle

## Critical Rules

1. **Orchestrate only.** This skill triages, routes, and dispatches. It never implements code.
2. **Delegate, don't duplicate.** Invoke issue-triage for ranking. Agents invoke scope-work for scoping.
3. **Model routing is visible.** All model assignments are shown at the dispatch checkpoint. Never assign a model silently.
4. **Maximize parallelism.** If N issues are independent, fire N agents.
5. **User has final say.** The dispatch checkpoint is a hard gate — no agents launch without approval.
```

**Step 3: Verify the file exists and frontmatter is correct**

Run: `head -5 .claude/skills/work-session/SKILL.md`
Expected: The YAML frontmatter block with `name: work-session`

**Step 4: Commit**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "feat(skill): scaffold work-session skill with frontmatter and overview"
```

---

### Task 2: Write Step 1 (Triage) and Step 2 (User Selection)

**Files:**
- Modify: `.claude/skills/work-session/SKILL.md`

**Step 1: Append the triage and selection sections**

Add to the end of the file:

```markdown
## Process

### Step 1: Triage

Invoke the `issue-triage` skill. Follow it exactly — fetch issues, check staleness, analyze, rank, output the top-5 table.

The output includes the standard triage table with columns: #, Priority, Issue, Severity, Effort, Independent?, Staleness.

Retain the independence analysis data from issue-triage Step 5 — you will need the file-overlap information in Step 4.

### Step 2: User Selection

After the triage table is displayed, prompt:

> Which issues do you want to work on? (e.g., 1, 3, 5)

Accept comma-separated numbers referencing row numbers in the triage table. Validate that the numbers correspond to actual rows.
```

**Step 2: Verify the file reads correctly**

Run: `grep -c "### Step" .claude/skills/work-session/SKILL.md`
Expected: `2` (Step 1 and Step 2)

**Step 3: Commit**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "feat(skill): add triage invocation and user selection steps"
```

---

### Task 3: Write Step 3 (Model Assignment)

**Files:**
- Modify: `.claude/skills/work-session/SKILL.md`

**Step 1: Append the model assignment section**

Add to the end of the file:

```markdown
### Step 3: Model Assignment

For each selected issue, determine the Claude model:

**Resolution order (first match wins):**

1. **Issue explicit** — The issue body contains a line matching `model: opus`, `model: sonnet`, or `model: haiku` (case-insensitive). Use that model. No override, no questions.
2. **Default** — Sonnet.

**Escalation suggestions (non-blocking):**

If a Sonnet-defaulted issue has any of these signals, add a warning note in the dispatch checkpoint (Step 5) suggesting the user consider Opus:

- Issue has a `category:security` label
- Issue body references 4+ files across different architectural layers
- Issue has a `severity:critical` label

The skill never overrides the Sonnet default on its own. Suggestions are informational — the user decides at the checkpoint.
```

**Step 2: Verify the step count**

Run: `grep -c "### Step" .claude/skills/work-session/SKILL.md`
Expected: `3`

**Step 3: Commit**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "feat(skill): add model assignment rules with escalation suggestions"
```

---

### Task 4: Write Step 4 (Independence Check) and Step 5 (Dispatch Checkpoint)

**Files:**
- Modify: `.claude/skills/work-session/SKILL.md`

**Step 1: Append independence check and checkpoint sections**

Add to the end of the file:

```markdown
### Step 4: Independence Check

Using the file-overlap data gathered during issue-triage (its Step 5 — independence analysis), check the user's selected issues against each other:

- **Independent** — no file overlap between selected issues → all dispatch in parallel
- **Dependent** — two selected issues share files → warn the user and ask:
  > Issues #X and #Y both touch [shared files]. Working them in parallel may cause merge conflicts. Proceed with both, or drop one?

Goal: maximize the number of concurrent agents. If all N selected issues are independent, fire N agents.

### Step 5: Dispatch Checkpoint

Present this table and **wait for explicit approval** before proceeding:

```
Ready to dispatch:
  Agent 1: #42 — Add error boundary       → Sonnet (default)
  Agent 2: #38 — Refactor auth flow        → Opus (issue specifies)
  Agent 3: #45 — Fix CSS overflow          → Sonnet (default)

  ⚠️  #42 has category:security — consider Opus?

Proceed? (y / edit model assignments / pick different issues)
```

**User responses:**
- **y** — proceed to Step 6
- **edit model assignments** — user specifies new model for one or more agents, then re-display the table
- **pick different issues** — return to Step 2
```

**Step 2: Verify the step count**

Run: `grep -c "### Step" .claude/skills/work-session/SKILL.md`
Expected: `5`

**Step 3: Commit**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "feat(skill): add independence check and dispatch checkpoint"
```

---

### Task 5: Write Step 6 (Agent Dispatch)

**Files:**
- Modify: `.claude/skills/work-session/SKILL.md`

**Step 1: Append the agent dispatch section**

Add to the end of the file:

````markdown
### Step 6: Agent Dispatch

On user approval, fire all agents in parallel. Each agent runs in its own git worktree (`isolation: "worktree"`) with the model assigned at the checkpoint.

**Branch naming:** `ISSUE-<number>/<short-slug>` — e.g., `ISSUE-51/add-error-boundary`

**Agent prompt template:**

Each agent receives the following instructions:

```
You are implementing GitHub issue #<number>: "<title>" for the repo kzbigboss/OscarsPartyVotingApp.

Follow the Agent Workflow defined in CLAUDE.md:

1. Comment on the GitHub issue: "Starting work on this."
   Run: gh issue comment <number> --repo kzbigboss/OscarsPartyVotingApp --body "Starting work on this."

2. Create your branch:
   Run: git checkout -b ISSUE-<number>/<short-slug>

3. Invoke the scope-work skill on issue #<number> to produce a change map and implementation approach.
   Note: scope-work will present a draft issue update — since the issue already exists, use the change map and success criteria as your implementation guide rather than creating a new issue.

4. Implement the scoped work using TDD:
   - Write failing test first
   - Implement minimal code to pass
   - Refactor if needed
   - Repeat for each change in the change map

5. Verify everything passes:
   Run: npx vitest run && npm run lint && npm run build

6. Push and create PR:
   Run: git push -u origin ISSUE-<number>/<short-slug>
   Run: gh pr create --title "<short title>" --body "Closes #<number>\n\n<summary of changes>"

7. Comment summary on the issue:
   Run: gh issue comment <number> --repo kzbigboss/OscarsPartyVotingApp --body "<summary of what was done>"
```

**After dispatch:** The work-session skill is done. Each agent is fully autonomous from this point. Monitor progress via:

```bash
gh pr list --repo kzbigboss/OscarsPartyVotingApp
```

Or check issue comments for agent status updates.
````

**Step 2: Verify the step count**

Run: `grep -c "### Step" .claude/skills/work-session/SKILL.md`
Expected: `6`

**Step 3: Commit**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "feat(skill): add agent dispatch with prompt template and worktree isolation"
```

---

### Task 6: Write Common Mistakes and Model Routing Reference sections

**Files:**
- Modify: `.claude/skills/work-session/SKILL.md`

**Step 1: Append reference sections**

Add to the end of the file:

```markdown
## Model Routing Reference

| Signal | Model | Override? |
|--------|-------|-----------|
| Issue body says `model: <x>` | Specified model | Authoritative — always used |
| Default (no signal) | Sonnet | User can change at checkpoint |
| Escalation suggestion | Note shown, not applied | User decides |

## Common Mistakes

| Mistake | Correction |
|---------|-----------|
| Starting to implement code after triaging | This skill orchestrates only. Agents do the implementation. |
| Overriding the Sonnet default without user approval | Only suggest Opus at the checkpoint. Never silently upgrade. |
| Dispatching agents for dependent issues without warning | Always check file overlap first. Warn the user about potential merge conflicts. |
| Running scope-work yourself instead of delegating to agents | Agents run scope-work as their first step. The orchestrator stays lean. |
| Skipping the dispatch checkpoint | The checkpoint is a hard gate. Never launch agents without explicit user approval. |
| Using `markkazzaz/` branch prefix | This project uses `ISSUE-<number>/<short-slug>` for branch names. |
```

**Step 2: Verify the file is complete**

Run: `wc -l .claude/skills/work-session/SKILL.md`
Expected: approximately 140-170 lines

**Step 3: Commit**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "feat(skill): add model routing reference and common mistakes"
```

---

### Task 7: Final verification and squash commit

**Files:**
- Verify: `.claude/skills/work-session/SKILL.md`

**Step 1: Read the full file end-to-end and verify structure**

Run: `cat .claude/skills/work-session/SKILL.md`

Verify:
- [ ] YAML frontmatter has `name`, `description`, `disable-model-invocation: true`
- [ ] Overview section references all three composed skills
- [ ] 5 critical rules present
- [ ] 6 steps in process (triage → selection → model → independence → checkpoint → dispatch)
- [ ] Model routing resolution order is clear (issue explicit → default Sonnet)
- [ ] Escalation suggestions are non-blocking
- [ ] Agent prompt template includes all 7 lifecycle steps from CLAUDE.md
- [ ] Branch naming uses `ISSUE-<number>/<short-slug>`
- [ ] Common mistakes table present
- [ ] No implementation logic — only orchestration

**Step 2: Verify lint passes**

Run: `npm run lint`
Expected: No new errors (skill is markdown, shouldn't affect linting, but verify nothing broke)

**Step 3: Final commit if any fixes were needed**

```bash
git add .claude/skills/work-session/SKILL.md
git commit -m "chore(skill): finalize work-session skill"
```

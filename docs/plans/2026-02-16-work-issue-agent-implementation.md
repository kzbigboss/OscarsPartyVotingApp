# Work-Issue Agent Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a project-scoped orchestrator skill that autonomously implements GitHub issues end-to-end.

**Architecture:** Single SKILL.md file in `.claude/skills/work-issue/` that composes existing superpowers skills (issue-triage, using-git-worktrees, brainstorming, writing-plans, subagent-driven-development, finishing-a-development-branch) into a 7-phase linear workflow with detailed GitHub issue comments at each phase.

**Tech Stack:** Claude Code skill (markdown with YAML frontmatter), GitHub CLI (`gh`)

**Design Doc:** `docs/plans/2026-02-16-work-issue-agent-design.md`

---

### Task 1: Create skill directory and SKILL.md skeleton

**Files:**
- Create: `.claude/skills/work-issue/SKILL.md`

**Step 1: Create the directory**

```bash
mkdir -p .claude/skills/work-issue
```

**Step 2: Write the SKILL.md skeleton**

Create `.claude/skills/work-issue/SKILL.md` with this exact content:

```markdown
---
name: work-issue
description: Use when assigned a GitHub issue to implement end-to-end, or when starting a work session and ready to pick up the next issue — orchestrates the full lifecycle from issue claim through PR creation
---

# Work Issue

Autonomously implement a GitHub issue end-to-end: claim it, design a solution, implement with TDD, and deliver a PR with passing CI.

**Announce at start:** "I'm using the work-issue skill to implement this issue end-to-end."

## Input

`$ARGUMENTS` is an optional GitHub issue number.

- **Issue number provided** (e.g., `/work-issue 42`): Use that issue directly.
- **No arguments** (e.g., `/work-issue`): Invoke `issue-triage` skill to pick the #1 ranked independent issue. Do NOT present the triage table to the user — pick the top issue and proceed.

## Workflow

Seven phases, executed sequentially. Post a GitHub issue comment at every phase transition.
```

**Step 3: Verify the file exists and frontmatter is valid**

Run: `head -5 .claude/skills/work-issue/SKILL.md`
Expected: The YAML frontmatter block with `name: work-issue` and `description: Use when...`

**Step 4: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat(skill): scaffold work-issue skill with frontmatter and input parsing"
```

---

### Task 2: Write Phase 1 (CLAIM) and Phase 2 (WORKTREE)

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md`

**Step 1: Append the CLAIM and WORKTREE phases**

Add the following to the end of `.claude/skills/work-issue/SKILL.md`:

```markdown

### Phase 1: CLAIM

Acquire the issue and signal that work is starting.

1. Fetch the issue:
   ```bash
   gh issue view $ISSUE_NUMBER
   ```
2. Read the issue title and body. Extract a lowercase slug from the title (e.g., "Add copy invite link button" → `copy-invite-link`). Use only lowercase letters and hyphens, max 40 chars.
3. Post a starting comment:
   ```bash
   gh issue comment $ISSUE_NUMBER --body "**[Starting]** Picking up this issue."
   ```

### Phase 2: WORKTREE

Create an isolated workspace. **REQUIRED SUB-SKILL:** Use `superpowers:using-git-worktrees`.

**Pre-answered decisions for the sub-skill:**
- **Directory:** `.worktrees/` (already exists, already gitignored)
- **Branch name:** `markkazzaz/issue-$ISSUE_NUMBER-$SLUG`

After the worktree is created and baseline tests pass, post a comment:

```bash
gh issue comment $ISSUE_NUMBER --body "**[Worktree]** Branch \`markkazzaz/issue-$ISSUE_NUMBER-$SLUG\` created. Baseline tests passing."
```

If baseline tests fail, post and stop:

```bash
gh issue comment $ISSUE_NUMBER --body "$(cat <<'EOF'
**[Stopped]** Work paused at WORKTREE phase.

**Completed:**
- Issue claimed

**Remaining:**
- All implementation work

**Error:**
> Baseline tests failing on main. This issue predates the work.
EOF
)"
```
```

**Step 2: Verify the new sections exist**

Run: `grep -c "### Phase" .claude/skills/work-issue/SKILL.md`
Expected: `2`

**Step 3: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat(skill): add CLAIM and WORKTREE phases to work-issue"
```

---

### Task 3: Write Phase 3 (DESIGN) and Phase 4 (PLAN)

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md`

**Step 1: Append the DESIGN and PLAN phases**

Add the following to the end of `.claude/skills/work-issue/SKILL.md`:

```markdown

### Phase 3: DESIGN

Design the solution. **REQUIRED SUB-SKILL:** Use `superpowers:brainstorming`.

**Pre-answered decisions for the sub-skill:**
- **Input requirements:** Use the GitHub issue body as the spec. Do NOT ask the user clarifying questions interactively.
- **If the issue was created by the `scope-work` skill** (identifiable by having a "Change Map" and "Success Criteria" section): Treat the change map, success criteria, and recommended approach as the pre-approved design. Skip the brainstorming exploration and go directly to writing the design doc.
- **If the issue is a plain description:** Design autonomously using best judgment. Choose the simplest approach that satisfies the requirements.
- **Design doc naming:** `docs/plans/YYYY-MM-DD-issue-$ISSUE_NUMBER-$SLUG-design.md`

After the design is complete, post a comment:

```bash
gh issue comment $ISSUE_NUMBER --body "**[Design]** Approach: {2-3 sentence summary of chosen design}."
```

If the issue body is too vague to design from, post and stop:

```bash
gh issue comment $ISSUE_NUMBER --body "**[Needs Clarification]** The issue description is too vague to design a solution. Please add more detail about expected behavior and constraints."
```

### Phase 4: PLAN

Create the implementation plan. Brainstorming naturally transitions to `superpowers:writing-plans` — let this flow happen.

**Pre-answered decisions for the sub-skill:**
- **Plan naming:** `docs/plans/YYYY-MM-DD-issue-$ISSUE_NUMBER-$SLUG.md`
- **Execution choice:** When writing-plans asks "Subagent-Driven or Parallel Session?", choose **Subagent-Driven** (stays in this session).

After the plan is complete, post a comment:

```bash
gh issue comment $ISSUE_NUMBER --body "**[Plan]** Implementation plan ready: {N} tasks across {M} files."
```
```

**Step 2: Verify the new sections exist**

Run: `grep -c "### Phase" .claude/skills/work-issue/SKILL.md`
Expected: `4`

**Step 3: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat(skill): add DESIGN and PLAN phases to work-issue"
```

---

### Task 4: Write Phase 5 (IMPLEMENT)

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md`

**Step 1: Append the IMPLEMENT phase**

Add the following to the end of `.claude/skills/work-issue/SKILL.md`:

```markdown

### Phase 5: IMPLEMENT

Execute the plan. **REQUIRED SUB-SKILL:** Use `superpowers:subagent-driven-development`.

This dispatches a fresh subagent per task with code review between tasks. Follow the TDD red-green-refactor cycle for every task — this is non-negotiable.

**Progress updates:** After each task completes and passes review, post a comment:

```bash
gh issue comment $ISSUE_NUMBER --body "**[Progress]** Task {i}/{N} complete: {task description}. Tests passing."
```

**If a task fails after one retry:** Post a comment and decide whether to continue or stop based on task independence:

```bash
gh issue comment $ISSUE_NUMBER --body "**[Blocked]** Task {i}/{N} failed: {task description}. Error: {details}. Continuing with independent tasks."
```

If no remaining tasks are independent of the failed one, stop:

```bash
gh issue comment $ISSUE_NUMBER --body "$(cat <<'EOF'
**[Stopped]** Work paused at IMPLEMENT phase.

**Completed:**
- {list completed tasks}

**Remaining:**
- {list remaining tasks}

**Error:**
> {failure details}
EOF
)"
```
```

**Step 2: Verify the new section exists**

Run: `grep -c "### Phase" .claude/skills/work-issue/SKILL.md`
Expected: `5`

**Step 3: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat(skill): add IMPLEMENT phase to work-issue"
```

---

### Task 5: Write Phase 6 (FINISH) and Phase 7 (VERIFY)

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md`

**Step 1: Append the FINISH and VERIFY phases**

Add the following to the end of `.claude/skills/work-issue/SKILL.md`:

```markdown

### Phase 6: FINISH

Create the PR. **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`.

**Pre-answered decisions for the sub-skill:**
- **Option:** Option 2 — Push and create PR
- **Base branch:** `main`

**PR body format:**

```markdown
## Summary
Closes #$ISSUE_NUMBER

{2-3 bullets from the design/plan}

## Changes
{Change map from design — layer/action/files}

## Test Plan
- [ ] All new tests passing
- [ ] All existing tests passing
- [ ] `npm run build` succeeds
- [ ] `npm run lint` clean
```

After creating the PR, post a comment:

```bash
gh issue comment $ISSUE_NUMBER --body "**[PR]** PR #$PR_NUMBER created. Waiting for CI checks."
```

### Phase 7: VERIFY

Wait for CI checks to pass before declaring the work done.

1. **Poll for CI completion:**
   ```bash
   gh pr checks $PR_NUMBER --watch
   ```

2. **If all checks pass:** Post final comment and stop.
   ```bash
   gh issue comment $ISSUE_NUMBER --body "**[Ready]** All CI checks passing. PR #$PR_NUMBER is ready for merge."
   ```

3. **If any check fails:**
   - Read the failure output: `gh pr checks $PR_NUMBER`
   - If helpful, read the run logs: `gh run view $RUN_ID --log-failed`
   - Diagnose the root cause and fix the issue in the worktree
   - Push the fix and post a comment:
     ```bash
     gh issue comment $ISSUE_NUMBER --body "**[CI Fix]** \`$CHECK_NAME\` failed. Pushing fix."
     ```
   - Loop back to step 1. **Maximum 3 fix attempts.**

4. **If still failing after 3 attempts:** Post and stop.
   ```bash
   gh issue comment $ISSUE_NUMBER --body "**[Blocked]** CI still failing after 3 fix attempts. Remaining failure: {description}. Manual intervention needed."
   ```
```

**Step 2: Verify the new sections exist**

Run: `grep -c "### Phase" .claude/skills/work-issue/SKILL.md`
Expected: `7`

**Step 3: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat(skill): add FINISH and VERIFY phases to work-issue"
```

---

### Task 6: Write supporting sections

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md`

**Step 1: Append the override table, error handling, and red flags**

Add the following to the end of `.claude/skills/work-issue/SKILL.md`:

```markdown

## Sub-skill Override Table

When invoking composed skills, pre-answer these decisions so the workflow runs autonomously:

| Skill | Normal Behavior | Override |
|-------|----------------|----------|
| `issue-triage` | Outputs ranked table and stops | Pick #1 independent issue, continue |
| `using-git-worktrees` | May ask where to create worktree | Pre-answer: `.worktrees/` |
| `brainstorming` | Interactive Q&A, approach selection | Use issue body as spec, design autonomously |
| `writing-plans` | Asks execution choice | Pre-select: subagent-driven development |
| `finishing-a-development-branch` | Presents 4 options | Pre-select: Option 2 (push + PR) |
| `finishing-a-development-branch` | Asks base branch | Pre-answer: `main` |

**Principle:** Override choices, never override safety checks. Worktree safety verification, baseline tests, TDD cycle, and test verification before PR always run.

## Error Handling

**Universal rules:**
- Never force-push
- Every failure gets a GitHub issue comment
- Leave worktree intact on failure (user or future session can resume)
- On any stop, post a summary comment with completed work, remaining work, and error details

**Stop comment format:**

```markdown
**[Stopped]** Work paused at {PHASE} phase.

**Completed:**
- {what was done}

**Remaining:**
- {what still needs to happen}

**Error:**
> {error details}
```

## Red Flags

**Never:**
- Force-push any branch
- Skip baseline test verification in the worktree
- Skip the TDD cycle during implementation
- Create a PR with failing tests
- Silently swallow errors — every failure must be posted to the issue
- Close the issue manually — `Closes #N` in the PR handles this on merge

**Always:**
- Post a GitHub comment at every phase transition
- Leave the worktree intact on failure
- Verify CI checks pass before declaring work complete
- Use the phase badge format for all comments: `**[Phase]** Message`
```

**Step 2: Verify the override table and error handling exist**

Run: `grep -c "^## " .claude/skills/work-issue/SKILL.md`
Expected: At least 5 top-level sections (Input, Workflow, Sub-skill Override Table, Error Handling, Red Flags)

**Step 3: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat(skill): add override table, error handling, and red flags to work-issue"
```

---

### Task 7: Validate complete skill against design doc

**Files:**
- Read: `.claude/skills/work-issue/SKILL.md`
- Read: `docs/plans/2026-02-16-work-issue-agent-design.md`

**Step 1: Verify all 7 phases are present**

Run: `grep "### Phase" .claude/skills/work-issue/SKILL.md`
Expected output:
```
### Phase 1: CLAIM
### Phase 2: WORKTREE
### Phase 3: DESIGN
### Phase 4: PLAN
### Phase 5: IMPLEMENT
### Phase 6: FINISH
### Phase 7: VERIFY
```

**Step 2: Verify all composed skills are referenced**

Run: `grep "SUB-SKILL" .claude/skills/work-issue/SKILL.md`
Expected: References to `using-git-worktrees`, `brainstorming`, `subagent-driven-development`, `finishing-a-development-branch`

**Step 3: Verify all GitHub comment badges are present**

Run: `grep -oP '\*\*\[\w+\]\*\*' .claude/skills/work-issue/SKILL.md | sort -u`
Expected: `**[Blocked]**`, `**[CI Fix]**`, `**[Design]**`, `**[Needs Clarification]**`, `**[Plan]**`, `**[PR]**`, `**[Progress]**`, `**[Ready]**`, `**[Starting]**`, `**[Stopped]**`, `**[Worktree]**`

**Step 4: Cross-reference with design doc**

Read both files. Verify:
- [ ] Every phase in the design doc has a corresponding section in SKILL.md
- [ ] The override table matches the design doc
- [ ] Error handling covers all failure modes from the design doc
- [ ] The PR body format includes `Closes #N`
- [ ] The VERIFY phase includes the 3-attempt retry loop

**Step 5: Final commit if any adjustments were needed**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "fix(skill): address validation findings in work-issue"
```

Skip this commit if no changes were needed.

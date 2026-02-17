# Work-Issue Agent Skill Design

## Overview

A project-scoped Claude Code skill that acts as an autonomous engineering agent. Given a GitHub issue (or auto-triaged), it claims the issue, implements a solution in an isolated worktree, posts detailed progress comments, and creates a PR that closes the issue once CI passes.

**Approach:** Single orchestrator skill (Approach A) that composes existing superpowers skills — reuses proven workflows and stays in sync as skills evolve.

**Location:** `.claude/skills/work-issue/SKILL.md`
**Invocation:** `/work-issue 42` or `/work-issue` (no argument triggers auto-triage)

## Skill Identity

```yaml
name: work-issue
description: Use when assigned a GitHub issue to implement end-to-end, or when starting a work session and ready to pick up the next issue — orchestrates the full lifecycle from issue claim through PR creation
```

## Workflow Phases

```
CLAIM → WORKTREE → DESIGN → PLAN → IMPLEMENT → FINISH → VERIFY
                                                           ↻
                                                     (fix & retry
                                                      up to 3x)
```

### Phase 1: CLAIM

- If no issue number provided: invoke `issue-triage` skill, pick the #1 ranked independent issue
- Fetch the issue with `gh issue view N`
- Post comment: **[Starting]** Picking up this issue.
- Extract a slug from the issue title for branch naming

### Phase 2: WORKTREE

- Invoke `using-git-worktrees` skill
- Branch name: `markkazzaz/issue-{N}-{slug}` (per global CLAUDE.md org-repo rule)
- Use `.worktrees/` directory (already exists, already gitignored)
- Post comment: **[Worktree]** Branch `markkazzaz/issue-N-slug` created. Baseline tests passing (N tests).

### Phase 3: DESIGN

- Invoke `brainstorming` skill using the issue body as input requirements
- Skip interactive Q&A — use issue body as the spec. If created by `scope-work`, treat change map/success criteria/recommended approach as the approved design. Otherwise, design autonomously.
- Design doc saved to `docs/plans/YYYY-MM-DD-issue-N-slug-design.md`
- Post comment: **[Design]** summary of chosen approach + link to design doc

### Phase 4: PLAN

- Brainstorming naturally transitions to `writing-plans` — let this flow happen
- Plan saved to `docs/plans/YYYY-MM-DD-issue-N-slug.md`
- Pre-select **subagent-driven development** when writing-plans offers execution choice
- Post comment: **[Plan]** task count and high-level breakdown

### Phase 5: IMPLEMENT

- Execute via `subagent-driven-development` (fresh subagent per task, code review between tasks)
- Post comments as tasks complete: **[Progress]** Task {i}/{N} complete: {description}. Tests passing.

### Phase 6: FINISH

- Invoke `finishing-a-development-branch` skill
- Pre-select **Option 2: Push and create PR**
- Pre-answer base branch: `main`
- PR body includes `Closes #N` to auto-close the issue on merge
- Post comment: **[PR]** PR #{X} created. Waiting for CI checks.

### Phase 7: VERIFY

- Poll `gh pr checks {PR_NUMBER} --watch` to wait for CI completion
- **If all checks pass:** Post comment: **[Ready]** All CI checks passing. PR #{X} is ready for merge.
- **If checks fail:** Diagnose, fix in worktree, push fix, post comment: **[CI Fix]** pushed. Max 3 fix attempts.
- **If still failing after 3 attempts:** Post comment: **[Blocked]** with remaining failure description. Leave PR open for manual intervention.

## Sub-skill Override Table

| Skill | Normal Behavior | Override |
|-------|----------------|----------|
| `issue-triage` | Outputs ranked table and stops | Pick #1 independent issue, continue |
| `using-git-worktrees` | May ask where to create worktree | Pre-answer: `.worktrees/` |
| `brainstorming` | Interactive Q&A, approach selection | Use issue body as spec, design autonomously |
| `writing-plans` | Asks execution choice | Pre-select: subagent-driven development |
| `finishing-a-development-branch` | Presents 4 options | Pre-select: Option 2 (push + PR) |
| `finishing-a-development-branch` | Asks base branch | Pre-answer: `main` |

**Principle:** Override choices, never override safety checks. Worktree safety verification, baseline tests, TDD cycle, and test verification before PR always run.

## GitHub Issue Comments

Each comment uses a phase badge for scannability:

```markdown
**[PHASE]** Message

> Detail line (optional)
```

Full timeline:

| Phase | Comment |
|-------|---------|
| CLAIM | **[Starting]** Picking up this issue. |
| WORKTREE | **[Worktree]** Branch created. Baseline tests passing (N tests). |
| DESIGN | **[Design]** Approach summary. Design doc link. |
| PLAN | **[Plan]** N tasks across M files. |
| IMPLEMENT | **[Progress]** Task i/N complete: description. Tests passing. |
| FINISH | **[PR]** PR #X created. Waiting for CI checks. |
| VERIFY | **[Ready]** All CI checks passing. PR #X ready for merge. |
| VERIFY (fix) | **[CI Fix]** Check failed. Pushing fix. |
| VERIFY (fail) | **[Blocked]** CI still failing after 3 attempts. |

## PR Body Structure

```markdown
## Summary
Closes #{N}

{2-3 bullets from the design/plan}

## Changes
{Change map from design — layer/action/files}

## Test Plan
- [ ] All new tests passing
- [ ] All existing tests passing
- [ ] `npm run build` succeeds
- [ ] `npm run lint` clean
```

## Error Handling

| Phase | Failure Mode | Recovery |
|-------|-------------|----------|
| CLAIM | Issue doesn't exist or is closed | Report error to user, stop. No comment posted. |
| CLAIM (triage) | No open issues | Report "No open issues to triage." Stop. |
| WORKTREE | Baseline tests fail | Post **[Blocked]** comment. Stop. |
| WORKTREE | Branch name exists | Append `-v2`, `-v3` suffix. Post comment noting retry. |
| DESIGN | Issue body too vague | Post **[Needs Clarification]** comment. Stop. |
| IMPLEMENT | Task tests won't pass | Retry once. If still failing, post **[Blocked]**. Continue with independent tasks or stop if blocked. |
| FINISH | `git push` fails | Post comment with error. Stop. |
| VERIFY | CI fails 3 times | Post **[Blocked]** with failure description. Leave PR open. |

**Universal rules:**
- Never force-push
- Every failure gets a GitHub issue comment
- Leave worktree intact on failure (enables resume)
- On any stop, post a summary of completed vs remaining work

**Stop comment format:**
```markdown
**[Stopped]** Work paused at {phase} phase.

**Completed:**
- {what was done}

**Remaining:**
- {what still needs to happen}

**Error:**
> {error details}
```

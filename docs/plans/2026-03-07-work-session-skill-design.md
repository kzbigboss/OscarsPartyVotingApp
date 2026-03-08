# Work-Session Orchestrator Skill — Design

## Summary

A composing skill that chains issue-triage → user selection → model assignment → parallel agent dispatch. It owns the glue between existing skills (issue-triage, scope-work) and agent execution, adding model routing to optimize Claude usage. Agents run in isolated worktrees and are fully autonomous after dispatch.

## Skill Identity

- **Name:** `work-session`
- **Location:** `.claude/skills/work-session/SKILL.md`
- **Trigger:** Starting a work session, "what should I work on", "start working", or `/work-session`
- **Frontmatter:** `disable-model-invocation: true` (guide, not auto-executable)

## Flow

```
Step 1: Invoke issue-triage → top-5 ranked table
Step 2: User picks issues (e.g., "1, 3, 5")
Step 3: Model assignment per issue
Step 4: Independence check (file overlap from triage data)
Step 5: Present dispatch checkpoint
Step 6: Fire N agents in parallel (one per independent issue)
```

## Step Details

### Step 1: Triage

Invoke the `issue-triage` skill exactly as defined. Output is the standard top-5 table with priority, severity, effort, independence, and staleness columns.

### Step 2: User Selection

Prompt: "Which issues do you want to work on? (e.g., 1, 3, 5)"

Accept comma-separated numbers referencing rows in the triage table.

### Step 3: Model Assignment

**Resolution order (first match wins):**

1. **Issue explicit** — Issue body contains `model: opus`, `model: sonnet`, or `model: haiku` (case-insensitive regex: `/model:\s*(opus|sonnet|haiku)/i`). Use that model, no questions asked.
2. **Default** — Sonnet for everything else.

**Escalation suggestion (non-blocking):** If a Sonnet-defaulted issue has any of these signals, add a note in the checkpoint suggesting Opus:
- `category:security` label
- Issue body references 4+ files across different architectural layers
- `severity:critical` label

The user can accept or ignore at the checkpoint. The skill never overrides the default on its own.

### Step 4: Independence Check

Use file-overlap data already gathered during triage (Step 5 of issue-triage). For picked issues:
- **Independent** — no file overlap → dispatch in parallel
- **Dependent** — shares files with another picked issue → warn user, ask whether to proceed with both or drop one

Goal: maximize concurrent agents. If N issues are independent, fire N agents.

### Step 5: Dispatch Checkpoint

Present this table and wait for approval:

```
Ready to dispatch:
  Agent 1: #42 — Add error boundary       → Sonnet (default)
  Agent 2: #38 — Refactor auth flow        → Opus (issue specifies)
  Agent 3: #45 — Fix CSS overflow          → Sonnet (default)

  ⚠️  #42 has category:security — consider Opus?

Proceed? (y / edit model assignments / pick different issues)
```

### Step 6: Agent Dispatch

On approval, fire all agents in parallel. Each agent:

- **Isolation:** Runs in its own git worktree (`isolation: "worktree"`)
- **Model:** As assigned in the checkpoint
- **Branch naming:** `ISSUE-<number>/<short-slug>`

**Agent instructions (per agent):**

1. Comment on the GitHub issue: "Starting work on this."
2. Invoke `scope-work` on the issue to produce change map + implementation approach
3. Implement the scoped work using TDD
4. Verify: `npx vitest run` && `npm run lint` && `npm run build`
5. Push branch and create PR linked to issue
6. Comment summary on the issue

**After dispatch:** The skill's job is done. Agents are autonomous. User monitors via GitHub issue comments or `gh pr list`.

## Dependencies

| Skill | Role | Owned by |
|-------|------|----------|
| `issue-triage` | Step 1 — ranking | `.claude/skills/issue-triage/` |
| `scope-work` | Agent first step — change map | `.claude/skills/scope-work/` |
| Agent workflow | Agent lifecycle | `CLAUDE.md` § Agent Workflow |

## Model Routing Summary

| Signal | Model | Override? |
|--------|-------|-----------|
| Issue body says `model: <x>` | Specified model | Authoritative |
| Default (no signal) | Sonnet | User can change at checkpoint |
| Escalation suggestion | Note shown, not applied | User decides |

## Branch Naming

`ISSUE-<number>/<short-slug>` — e.g., `ISSUE-51/add-error-boundary`

## What This Skill Does NOT Do

- **Implement anything** — agents handle all code changes
- **Run scope-work** — agents run it as their first step
- **Duplicate triage logic** — delegates entirely to issue-triage
- **Override model choices silently** — all routing is visible at the checkpoint

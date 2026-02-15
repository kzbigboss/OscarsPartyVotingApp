# Issue Triage Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Claude Code skill that triages open GitHub issues for `kzbigboss/OscarsPartyVotingApp`, evaluates each against current codebase state, and outputs a prioritized top-5 terminal summary with independence analysis.

**Architecture:** Single SKILL.md file in `~/.claude/skills/issue-triage/` that instructs Claude to fetch issues via `gh`, cross-reference with codebase state via `git log`, rank by severity/effort/staleness, and print a formatted table.

**Tech Stack:** Claude Code skill (Markdown), `gh` CLI, `git`

---

### Task 1: Create skill directory

**Files:**
- Create: `~/.claude/skills/issue-triage/SKILL.md`

**Step 1: Create directory**

Run: `mkdir -p ~/.claude/skills/issue-triage`

**Step 2: Create SKILL.md with frontmatter and overview**

Write `~/.claude/skills/issue-triage/SKILL.md` with the complete skill content (see Task 2).

**Step 3: Commit**

Not applicable — skills directory is outside the repo. Verify file exists:

Run: `cat ~/.claude/skills/issue-triage/SKILL.md | head -5`
Expected: YAML frontmatter with `name: issue-triage`

---

### Task 2: Write the SKILL.md content

**Files:**
- Create: `~/.claude/skills/issue-triage/SKILL.md`

**Step 1: Write the complete SKILL.md**

The skill should contain these sections:

1. **YAML frontmatter** — name: `issue-triage`, description starting with "Use when..." focusing on triggers (deciding what to work on next, evaluating issue independence)

2. **Overview** — Core principle: evaluate issues against the *current* codebase, not just labels. Issues may be stale.

3. **Critical Rules**:
   - Always fetch fresh issue data (never cache or assume)
   - Check staleness by cross-referencing with `git log`
   - Respect existing severity labels as starting point, not gospel
   - Output top 5 only — don't overwhelm with full list
   - Never start working on an issue — triage only

4. **Process** (with flowchart):
   - Step 1: `gh issue list --repo kzbigboss/OscarsPartyVotingApp --state open --limit 50`
   - Step 2: `gh issue view <N>` for each issue to read body
   - Step 3: Staleness check — extract file paths from issue body, run `git log --since=<created_at> -- <files>` to see if code changed
   - Step 4: Analyze each issue for severity (from labels), category (from labels), estimated effort (from body), dependencies (from body references to other issues/files)
   - Step 5: Independence analysis — group issues by files they'd touch, flag overlapping ones as dependent
   - Step 6: Rank using heuristic
   - Step 7: Print formatted output

5. **Ranking Heuristic** (as table):
   - Priority 1: high severity + security
   - Priority 2: high severity + maintenance
   - Priority 3: medium severity (security > best-practice > maintenance)
   - Priority 4: low severity
   - Tiebreaker: lower effort wins
   - Demote "possibly resolved" issues

6. **Output Format** — exact template for the terminal summary table

7. **Common Mistakes** table

**Step 2: Verify skill is discoverable**

Run: `ls ~/.claude/skills/issue-triage/SKILL.md`
Expected: File exists

---

### Task 3: Test the skill (RED — baseline without skill)

**Step 1: Note baseline behavior**

Before the skill exists, ask Claude "what issue should I work on next?" in a new conversation in this repo. Document what it does — likely it won't check staleness, won't analyze independence, and may not use `gh` at all.

This is the RED phase — we expect the behavior to be incomplete.

**Step 2: Document gaps**

Note which of these the baseline misses:
- Fetching all issues via `gh`
- Reading issue bodies
- Staleness check against codebase
- Independence analysis
- Formatted top-5 output

---

### Task 4: Test the skill (GREEN — with skill)

**Step 1: Invoke the skill**

In a new conversation in this repo, invoke `/issue-triage` or trigger it by asking "what issue should I work on next?"

**Step 2: Verify output**

Check that the output includes:
- [ ] A table with top 5 issues
- [ ] Severity and category for each
- [ ] Effort estimate for each
- [ ] Independence flag for each
- [ ] Staleness status for each
- [ ] Independence analysis paragraph
- [ ] Summary of remaining issues

**Step 3: Verify staleness check ran**

Confirm that at least one `git log --since` command was executed to check for code changes since issue creation.

---

### Task 5: Refine the skill (REFACTOR)

**Step 1: Identify gaps from testing**

Review the GREEN test output. Identify:
- Any missing sections in the output
- Ranking decisions that seem wrong
- Staleness checks that produced incorrect results
- Independence analysis that missed overlapping files

**Step 2: Update SKILL.md**

Fix any issues found. Common refinements:
- Tighten the output format template
- Add explicit instructions for edge cases
- Strengthen the staleness check logic

**Step 3: Re-test**

Invoke the skill again and verify improvements.

**Step 4: Commit design doc update if needed**

If the design changed during refinement, update `docs/plans/2026-02-14-issue-triage-skill-design.md`.

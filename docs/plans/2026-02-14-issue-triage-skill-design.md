# Issue Triage Skill Design

## Goal

Create a Claude Code skill (`issue-triage`) that fetches all open GitHub issues for `kzbigboss/OscarsPartyVotingApp`, evaluates each one against the current codebase state, and outputs a prioritized terminal summary of the top 5 issues to work on next — including whether they can be worked independently.

## Decisions Made

- **Scope:** Repo-specific (hardcoded to `kzbigboss/OscarsPartyVotingApp`)
- **Data fetching:** Sequential `gh` CLI commands (`gh issue list` + `gh issue view` per issue)
- **Analysis:** Labels as starting point, then read issue bodies for effort/impact/dependencies
- **Staleness check:** Cross-reference issue content with current codebase via `git log`
- **Output:** Formatted terminal summary (top 5 issues), no file output
- **Post-triage:** Triage only — no automatic transition to implementation

## Process Flow

```
1. FETCH    — gh issue list --repo kzbigboss/OscarsPartyVotingApp --state open
2. READ     — gh issue view <number> for each open issue
3. STALENESS — For each issue, check if referenced files/code have changed since issue creation
4. ANALYZE  — Evaluate severity, category, effort, dependencies, independence
5. RANK     — Priority-order using heuristic (see below)
6. OUTPUT   — Print formatted terminal summary of top 5
```

## Ranking Heuristic

1. High severity security issues first (production readiness blockers)
2. High severity maintenance next (deployment blockers)
3. Medium severity: security > best-practice > maintenance
4. Low severity last
5. Within same tier: prefer lower effort (quick wins)
6. Demote issues flagged as "possibly resolved"

## Staleness Check

For each issue:
- Read body for specific files/code mentioned
- Check `git log --since=<issue_created_at> -- <files>` for changes
- Flag as: "Still relevant" | "Possibly resolved" | "Needs verification"

## Output Format

Terminal markdown table with: priority rank, issue # and title, severity, effort estimate, independence flag, staleness status. Followed by an independence analysis paragraph and a brief summary of remaining issues.

## Skill Location

`~/.claude/skills/issue-triage/SKILL.md`

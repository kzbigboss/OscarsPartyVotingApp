# Playwright Multi-User Load Testing

## Goal

Verify the Oscars party voting app handles 10+ concurrent users correctly and find its scaling limits. Both functional correctness (votes propagate, scores compute correctly) and load testing (where does it break?).

## Approach

Single Node.js orchestrator script using Playwright's library API with multiple `BrowserContext` instances. One context acts as the host, the rest as guests. All contexts share one browser process.

## Prerequisites

- Party is created manually (Google Auth gated)
- Party URL and host PIN are provided as CLI arguments
- App is running locally or deployed

## File Structure

```
e2e/
├── load-test.js          # Main orchestrator script
├── helpers/
│   ├── host.js           # Host actions (join, activate PIN, lock, select winners)
│   ├── guest.js          # Guest actions (join, vote, check leaderboard)
│   └── metrics.js        # Timing/latency collection & reporting
```

## CLI Interface

```bash
node e2e/load-test.js --url http://localhost:5173/ABC123 --host-pin 1234 --guests 10
node e2e/load-test.js --url http://localhost:5173/ABC123 --host-pin 1234 --guests 25
node e2e/load-test.js --url http://localhost:5173/ABC123 --host-pin 1234 --guests 3 --headed
```

## Dependencies

- `@playwright/test` (dev dependency) - includes the library API

## Orchestration Flow

### Phase 1: Setup

- Parse CLI args (`--url`, `--host-pin`, `--guests`, `--headed`)
- Launch one Chromium browser instance
- Create host context, navigate to party URL, enter name, join
- Host context: enter PIN via HostModeToggle to activate host mode

### Phase 2: Guests Join

- Create N guest contexts in parallel (`Promise.all`)
- Each guest: navigate to party URL, enter unique name ("Guest 1"..."Guest N"), join
- Assertion: all guests appear on the leaderboard page

### Phase 3: Voting

- For each unlocked category, all guests vote on a random nominee (`Promise.all`)
- Metric: time from vote click to UI confirmation per guest
- Assertion: each guest's vote is reflected in their "You" page

### Phase 4: Host Announces Winners

- For each category (sequentially):
  - Host locks the category
  - Host selects a winner
  - Metric: time until all guest browsers show the winner update
  - Assertion: leaderboard scores update correctly across all guests
- Assertion: final leaderboard ranking matches expected scores

### Phase 5: Reporting

- Print summary table and exit

## Metrics

| Metric | Description |
|--------|-------------|
| Join latency | Time from name submit to ballot page load, per guest |
| Vote latency | Time from nominee click to UI confirmation |
| Propagation latency | Time from host selecting winner to guest leaderboard reflecting score change |
| Phase durations | Wall clock time for each phase |

### Output Format

```
--- Load Test Results ---
Guests: 15  |  Categories: 24  |  Duration: 47.2s

Phase Timing:
  Setup (host join + PIN):   2.1s
  Guest joins:               4.8s
  Voting:                   28.3s
  Winner announcements:     12.0s

Latency (ms):
                  avg     p50     p95     max
  Join:           320     290     510     680
  Vote:            85      72     140     210
  Propagation:    410     380     720    1100

Assertions: 18 passed, 0 failed
```

## Assertions

### After guest joins

- Guest is redirected to the ballot page
- Guest's name appears on the leaderboard page

### After voting

- Each guest's "You" page shows their selected nominee for each voted category
- No two guests share the same guestId (N distinct names on leaderboard)

### After winner announced (per category)

- All guest browsers show the winner indicator within 5s
- Leaderboard scores are consistent with votes and winners
- ScoreIndicator matches leaderboard score for each guest

### Final state

- Leaderboard shows all N+1 participants (N guests + host)
- Scores are mathematically consistent with votes cast and winners selected
- No guest score exceeds the number of announced winners

## Timeout Strategy

- Playwright `waitForSelector` / `expect(locator).toHaveText()` with auto-retry (default 5s)
- Propagation checks across all guests: 10s timeout to account for Firestore fan-out under load

## Failure Handling

- If a guest action fails, log the error with guest name and category, continue with remaining guests
- Collect all failures and report at the end
- Screenshots captured on failure and saved to `e2e/screenshots/`

## Backend

- Tests run against real Firebase (whatever the running app is configured to use)
- No emulator setup required
- Test data lives in a manually-created party; no cleanup needed beyond deleting the party when done

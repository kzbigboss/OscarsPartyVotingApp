# Automated E2E Winner Selection Test

## Problem

Phase 4 of the e2e load test requires a human operator to manually select winners via `--pause-for-winners`. Now that host delegates (issue #43) can perform host operations via PIN + anonymous auth, the test bot can automate this.

## Design

Replace the interactive pause-for-winners flow with fully automated winner selection and full guest result verification.

### CLI Changes

- Remove `--pause-for-winners` flag
- Remove `createInterface`/`waitForEnter` interactive prompts
- Keep `--categories N` to control how many categories get winners (default 5)

### Phase 4: Winner Announcement (automated)

1. Host bot iterates first N categories (controlled by `--categories`)
2. For each: `lockCategory(hostPage, i)` then `selectWinner(hostPage, i)` sequentially
3. Record winner names for later verification

### Phase 5: Guest Results Verification (new)

After all winners announced, verify every guest:

1. **Ballot propagation** — each guest sees N announced categories (`waitForAnnouncedCount`)
2. **Score check** — each guest's ScoreIndicator shows `X / N`
3. **You page** — each guest's You page shows correct/wrong marks for all announced categories

### New Helper

`getYouPageResults(page)` in `e2e/helpers/guest.js` — returns array of `{ category, isCorrect, isWrong, isAnnounced }` per vote row.

### File Changes

| File | Change |
|------|--------|
| `e2e/load-test.js` | Remove interactive mode. Add automated Phase 4 + Phase 5. |
| `e2e/helpers/guest.js` | Add `getYouPageResults()` |
| `e2e/helpers/host.js` | No changes |
| `e2e/helpers/metrics.js` | No changes |

### Test Flow

```
Phase 1: Host joins, activates host mode (unchanged)
Phase 2: Guests join (unchanged)
Phase 3: Guests vote (unchanged)
Phase 4: Host locks + selects winners for N categories (automated)
Phase 5: Verify all guests see results (ballot + score + You page)
Final: Leaderboard check, metrics report (unchanged)
```

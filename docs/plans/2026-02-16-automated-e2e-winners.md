# Automated E2E Winner Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the interactive `--pause-for-winners` e2e flow with fully automated host winner selection and comprehensive guest result verification.

**Architecture:** The host bot (already joined with PIN via anonymous auth) uses existing `lockCategory`/`selectWinner` helpers to announce winners in batch. A new Phase 5 verifies every guest sees announced categories, correct scores, and correct/wrong marks on their You page.

**Tech Stack:** Playwright, Node.js (ESM)

---

### Task 1: Add `getYouPageResults` helper

**Files:**
- Modify: `e2e/helpers/guest.js:85-92` (near existing `getYouPageVoteCount`)

**Step 1: Add the new helper function**

Add `getYouPageResults` after the existing `getYouPageVoteCount` function. This reads each vote row's CSS classes to determine announced/correct/wrong state.

```js
/**
 * Navigate to the You page and return detailed results per category.
 * Returns array of { category, pick, isAnnounced, isCorrect, isWrong }.
 */
export async function getYouPageResults(page) {
  await page.click('.nav-bar a:has-text("You")')
  await page.waitForSelector('.vote-summary', { timeout: 10000 })

  const rows = page.locator('.vote-row')
  const count = await rows.count()
  const results = []

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i)
    const category = await row.locator('.vote-category').innerText()
    const pick = await row.locator('.vote-pick').innerText()
    const classes = await row.getAttribute('class')
    results.push({
      category,
      pick,
      isAnnounced: classes.includes('correct') || classes.includes('wrong'),
      isCorrect: classes.includes('correct'),
      isWrong: classes.includes('wrong'),
    })
  }

  return results
}
```

**Step 2: Commit**

```bash
git add e2e/helpers/guest.js
git commit -m "feat(e2e): add getYouPageResults helper for detailed result verification"
```

---

### Task 2: Remove interactive mode from load-test.js

**Files:**
- Modify: `e2e/load-test.js:1-4` (imports)
- Modify: `e2e/load-test.js:9-18` (CLI args)
- Modify: `e2e/load-test.js:20-22` (usage string)
- Modify: `e2e/load-test.js:25-32` (config object)
- Modify: `e2e/load-test.js:47-55` (waitForEnter function)
- Modify: `e2e/load-test.js:59-63` (console output)

**Step 1: Remove `createInterface` import**

In the imports at the top, remove the `createInterface` import (line 4):
```js
// REMOVE this line:
import { createInterface } from 'node:readline'
```

**Step 2: Remove `--pause-for-winners` from CLI args**

Remove the `'pause-for-winners'` option from `parseArgs` (line 16):
```js
// REMOVE this line:
    'pause-for-winners': { type: 'boolean', default: false },
```

**Step 3: Update usage string**

Change usage string (line 21) to remove `--pause-for-winners` references:
```js
  console.error('Usage: node e2e/load-test.js --url <partyUrl> --host-pin <pin> [--guests N] [--categories N] [--headed]')
```

**Step 4: Remove `pauseForWinners` from config**

Remove `pauseForWinners` from the config object (line 31):
```js
// REMOVE this line:
  pauseForWinners: values['pause-for-winners'],
```

**Step 5: Remove `waitForEnter` function**

Delete the entire `waitForEnter` function (lines 47-55).

**Step 6: Remove interactive mode console output**

Remove the `if (config.pauseForWinners)` block in the console output section (lines 60-62):
```js
// REMOVE these lines:
if (config.pauseForWinners) {
  console.log(`  Interactive mode: will pause for you to announce ${config.categoriesToAnnounce} winners`)
}
```

**Step 7: Commit**

```bash
git add e2e/load-test.js
git commit -m "refactor(e2e): remove interactive pause-for-winners mode"
```

---

### Task 3: Replace Phase 4 with automated winner selection

**Files:**
- Modify: `e2e/load-test.js:5-6` (imports — add `lockCategory`, `selectWinner`)
- Modify: `e2e/load-test.js:158-207` (replace entire Phase 4 block)

**Step 1: Update host.js imports**

Change line 6 from:
```js
import { joinAsHost, getCategoryCount } from './helpers/host.js'
```
to:
```js
import { joinAsHost, getCategoryCount, lockCategory, selectWinner } from './helpers/host.js'
```

**Step 2: Replace Phase 4**

Replace the entire Phase 4 block (the `if (config.pauseForWinners) { ... } else { ... }` section, lines 158-207) with:

```js
  // === Phase 4: Winner Announcement ===
  const categoriesToAnnounce = Math.min(config.categoriesToAnnounce, categoryCount)
  metrics.startPhase('Winner announcement')
  console.log(`[Phase 4] Host announcing winners for ${categoriesToAnnounce}/${categoryCount} categories...`)

  const winnersByCategory = []

  for (let catIdx = 0; catIdx < categoriesToAnnounce; catIdx++) {
    try {
      await lockCategory(hostPage, catIdx)
      const winnerName = await selectWinner(hostPage, catIdx)
      winnersByCategory.push({ catIdx, winnerName })
      metrics.assert(`Host locks and selects winner for category ${catIdx}`, true)
      console.log(`  Category ${catIdx}: locked, winner = "${winnerName}"`)
    } catch (err) {
      console.error(`  [ERROR] Failed to announce category ${catIdx}: ${err.message}`)
      metrics.assert(`Host locks and selects winner for category ${catIdx}`, false)
      await screenshotOnError(hostPage, `host-announce-cat${catIdx}`)
    }
  }

  const announcedCount = winnersByCategory.length
  console.log(`  ${announcedCount}/${categoriesToAnnounce} categories announced`)
  metrics.endPhase()
```

**Step 3: Commit**

```bash
git add e2e/load-test.js
git commit -m "feat(e2e): automate Phase 4 winner selection via host bot"
```

---

### Task 4: Add Phase 5 — guest result verification

**Files:**
- Modify: `e2e/load-test.js:7` (imports — add `getYouPageResults`)
- Modify: `e2e/load-test.js` (insert Phase 5 after Phase 4, before leaderboard check)

**Step 1: Update guest.js imports**

Change line 7 from:
```js
import { joinParty, voteOnCategory, getLeaderboardNames, goToBallot, getScore, waitForAnnouncedCount } from './helpers/guest.js'
```
to:
```js
import { joinParty, voteOnCategory, getLeaderboardNames, goToBallot, getScore, waitForAnnouncedCount, getYouPageResults } from './helpers/guest.js'
```

**Step 2: Insert Phase 5 after Phase 4**

Insert this block between Phase 4 and the final leaderboard check:

```js
  // === Phase 5: Guest Result Verification ===
  metrics.startPhase('Result verification')
  console.log(`[Phase 5] Verifying ${config.numGuests} guests see ${announcedCount} results...`)

  for (let guestIdx = 0; guestIdx < guestPages.length; guestIdx++) {
    const guestLabel = `Guest ${guestIdx + 1}`
    const page = guestPages[guestIdx]

    try {
      // 5a: Ballot — check announced categories propagated
      await goToBallot(page)
      const propMs = await waitForAnnouncedCount(page, announcedCount, 15000)
      metrics.recordLatency('Propagation', propMs)
      metrics.assert(`${guestLabel} sees ${announcedCount} announced categories`, true)

      // 5b: Score indicator
      const score = await getScore(page)
      if (score) {
        metrics.assert(
          `${guestLabel} score shows ${announcedCount} total announced`,
          score.total === announcedCount
        )
        console.log(`  ${guestLabel}: score ${score.correct}/${score.total}, propagation ${propMs}ms`)
      }

      // 5c: You page — check correct/wrong marks
      const youResults = await getYouPageResults(page)
      const announcedResults = youResults.filter(r => r.isAnnounced)
      metrics.assert(
        `${guestLabel} You page shows ${announcedCount} announced results`,
        announcedResults.length === announcedCount
      )

      const correctCount = announcedResults.filter(r => r.isCorrect).length
      const wrongCount = announcedResults.filter(r => r.isWrong).length
      console.log(`  ${guestLabel} You page: ${correctCount} correct, ${wrongCount} wrong out of ${announcedResults.length} announced`)

      // Navigate back to ballot for leaderboard check
      await goToBallot(page)
    } catch (err) {
      console.error(`  [ERROR] ${guestLabel} verification failed: ${err.message}`)
      metrics.assert(`${guestLabel} result verification`, false)
      await screenshotOnError(page, `verification-${guestLabel.replace(/\s+/g, '')}`)
    }
  }

  metrics.endPhase()
```

**Step 3: Remove the old spot-check and score verification code**

The existing Phase 4 had inline score verification inside the `if (config.pauseForWinners)` block — this was already removed in Task 3. Also remove the old spot-check You page block that existed after Phase 3 (lines 146-156), since Phase 5 now does full verification:

```js
// REMOVE this block (the spot-check after Phase 3):
  // Spot-check: first guest's You page should show votes
  const { getYouPageVoteCount } = await import('./helpers/guest.js')
  const youPageResult = await getYouPageVoteCount(guestPages[0])
  if (youPageResult) {
    metrics.assert(
      `Guest 1 You page shows votes (${youPageResult.voted}/${youPageResult.total})`,
      youPageResult.voted > 0
    )
    console.log(`  Guest 1 You page: ${youPageResult.voted}/${youPageResult.total} votes`)
  }
  await goToBallot(guestPages[0])
```

**Step 4: Commit**

```bash
git add e2e/load-test.js
git commit -m "feat(e2e): add Phase 5 guest result verification (ballot + score + You page)"
```

---

### Task 5: Final cleanup and verification

**Step 1: Lint check**

Run: `npm run lint`
Expected: No errors

**Step 2: Verify the script parses correctly**

Run: `node --check e2e/load-test.js`
Expected: No syntax errors (exits 0)

**Step 3: Commit any lint fixes if needed**

```bash
git add e2e/
git commit -m "chore(e2e): lint cleanup"
```

---

### Running the Updated Test

To verify the full flow against a live party:

```bash
npm run e2e:load -- --url <partyUrl> --host-pin <pin> --guests 3 --categories 3 --headed
```

This will:
1. Host joins and activates host mode
2. 3 guests join and vote on all categories
3. Host locks and selects winners for 3 categories
4. All 3 guests verified: announced count, score, You page correct/wrong marks
5. Final leaderboard check and metrics report

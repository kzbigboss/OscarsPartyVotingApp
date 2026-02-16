# Playwright Multi-User Load Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Playwright-based orchestrator that launches 10+ simulated browser users against the live Oscars voting app, verifying functional correctness and measuring real-time propagation latency.

**Architecture:** Single Node.js script using Playwright's library API (not test runner). One Chromium browser instance with N+1 `BrowserContext` instances (1 host + N guests). CLI args supply the party URL, host PIN, and guest count. Helpers in separate modules for host actions, guest actions, and metrics collection.

**Tech Stack:** `@playwright/test` (library API), Node.js ESM, `parseArgs` from `node:util` for CLI.

---

### Task 1: Install Playwright and scaffold file structure

**Files:**
- Modify: `package.json` (add dev dependency + script)
- Create: `e2e/load-test.js` (entry point stub)
- Create: `e2e/helpers/host.js` (empty module)
- Create: `e2e/helpers/guest.js` (empty module)
- Create: `e2e/helpers/metrics.js` (empty module)

**Step 1: Install Playwright**

```bash
npm install -D @playwright/test
```

**Step 2: Install Chromium browser binary**

```bash
npx playwright install chromium
```

**Step 3: Add npm script to package.json**

Add to the `"scripts"` section:
```json
"e2e:load": "node e2e/load-test.js"
```

**Step 4: Update `.mise.toml` to add a setup task for Playwright's browser binary**

The `playwright` CLI is already available via `node_modules/.bin` (mise adds it to PATH). But the Chromium binary needs a one-time download. Add a mise task for this:

Append to `.mise.toml`:
```toml
[tasks.setup-playwright]
description = "Install Playwright browser binaries (Chromium)"
run = "npx playwright install chromium"
```

After this, developers run `mise run setup-playwright` once after `npm install` to get the browser binary. Also update the CLAUDE.md commands section to include:
```
mise run setup-playwright   # Install Playwright Chromium (one-time after npm install)
```

**Step 5: Create entry point stub**

Create `e2e/load-test.js`:
```js
import { chromium } from 'playwright'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    'host-pin': { type: 'string' },
    guests: { type: 'string', default: '10' },
    headed: { type: 'boolean', default: false },
  },
})

if (!values.url || !values['host-pin']) {
  console.error('Usage: node e2e/load-test.js --url <partyUrl> --host-pin <pin> [--guests N] [--headed]')
  process.exit(1)
}

const config = {
  url: values.url,
  hostPin: values['host-pin'],
  numGuests: parseInt(values.guests, 10),
  headed: values.headed,
}

console.log(`Load test: ${config.numGuests} guests against ${config.url}`)

const browser = await chromium.launch({ headless: !config.headed })
// TODO: orchestration phases
await browser.close()
console.log('Done.')
```

**Step 6: Create empty helper modules**

Create `e2e/helpers/host.js`:
```js
// Host actions: join party, activate host mode, lock categories, select winners
```

Create `e2e/helpers/guest.js`:
```js
// Guest actions: join party, vote on categories, check pages
```

Create `e2e/helpers/metrics.js`:
```js
// Metrics collection and reporting
```

**Step 7: Verify the stub runs**

```bash
node e2e/load-test.js --url http://localhost:5173/TEST --host-pin 1234
```

Expected: Prints "Load test: 10 guests against http://localhost:5173/TEST" then "Done."

**Step 8: Commit**

```bash
git add e2e/ package.json package-lock.json .mise.toml CLAUDE.md
git commit -m "feat: scaffold Playwright load test structure with mise setup task"
```

---

### Task 2: Build the metrics helper

**Files:**
- Modify: `e2e/helpers/metrics.js`

**Step 1: Implement metrics collector**

Write `e2e/helpers/metrics.js`:
```js
export class Metrics {
  constructor() {
    this.timings = {}     // { phaseName: durationMs }
    this.latencies = {}   // { metricName: [ms, ms, ...] }
    this.assertions = { passed: 0, failed: 0, failures: [] }
  }

  startPhase(name) {
    this._phaseStart = Date.now()
    this._phaseName = name
  }

  endPhase() {
    if (this._phaseName) {
      this.timings[this._phaseName] = Date.now() - this._phaseStart
    }
  }

  recordLatency(name, ms) {
    if (!this.latencies[name]) this.latencies[name] = []
    this.latencies[name].push(ms)
  }

  assert(description, condition) {
    if (condition) {
      this.assertions.passed++
    } else {
      this.assertions.failed++
      this.assertions.failures.push(description)
    }
  }

  _stats(values) {
    if (!values.length) return { avg: 0, p50: 0, p95: 0, max: 0 }
    const sorted = [...values].sort((a, b) => a - b)
    const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const max = sorted[sorted.length - 1]
    return { avg, p50, p95, max }
  }

  report() {
    const totalMs = Object.values(this.timings).reduce((s, v) => s + v, 0)
    const totalSec = (totalMs / 1000).toFixed(1)

    console.log('\n=== Load Test Results ===')
    console.log(`Duration: ${totalSec}s\n`)

    console.log('Phase Timing:')
    for (const [name, ms] of Object.entries(this.timings)) {
      console.log(`  ${name.padEnd(30)} ${(ms / 1000).toFixed(1)}s`)
    }

    if (Object.keys(this.latencies).length) {
      console.log('\nLatency (ms):')
      console.log('                        avg     p50     p95     max')
      for (const [name, values] of Object.entries(this.latencies)) {
        const s = this._stats(values)
        console.log(
          `  ${name.padEnd(20)} ${String(s.avg).padStart(5)}   ${String(s.p50).padStart(5)}   ${String(s.p95).padStart(5)}   ${String(s.max).padStart(5)}`
        )
      }
    }

    console.log(`\nAssertions: ${this.assertions.passed} passed, ${this.assertions.failed} failed`)
    if (this.assertions.failures.length) {
      console.log('Failures:')
      for (const f of this.assertions.failures) {
        console.log(`  - ${f}`)
      }
    }

    return this.assertions.failed === 0
  }
}
```

**Step 2: Verify it works with a quick smoke test in Node**

```bash
node -e "
import { Metrics } from './e2e/helpers/metrics.js'
const m = new Metrics()
m.startPhase('test'); m.endPhase()
m.recordLatency('vote', 100); m.recordLatency('vote', 200)
m.assert('truth', true); m.assert('lie', false)
m.report()
"
```

Expected: Prints a formatted report with 1 passed, 1 failed assertion.

**Step 3: Commit**

```bash
git add e2e/helpers/metrics.js
git commit -m "feat: add metrics collector with latency stats and assertions"
```

---

### Task 3: Build the guest helper

**Files:**
- Modify: `e2e/helpers/guest.js`

The guest helper encapsulates all actions a guest browser performs. Each function takes a Playwright `Page` and returns timing data.

**Key selectors** (from reading the JSX):
- Join page: `input[placeholder="Your name"]`, `button:has-text("Join Party")`
- Ballot page: `.category-card`, `.category-header`, `.nominee`, `.nominee-name`, `.vote-badge` ("Your pick")
- NavBar links: `.nav-bar a:has-text("Leaderboard")`, `.nav-bar a:has-text("You")`
- Leaderboard: `.rank-row`, `.guest-name`
- You page: `.vote-row`, `.vote-pick`
- Winner badge: `.winner-badge`
- Score indicator: `.score-indicator`

**Step 1: Implement guest helper**

Write `e2e/helpers/guest.js`:
```js
/**
 * Join the party by entering a display name on the Join page.
 * Returns the time (ms) from form submission to ballot page load.
 */
export async function joinParty(page, partyUrl, displayName) {
  const start = Date.now()
  await page.goto(partyUrl, { waitUntil: 'networkidle' })
  await page.fill('input[placeholder="Your name"]', displayName)
  await page.click('button:has-text("Join Party")')
  await page.waitForURL(/\/ballot$/, { timeout: 15000 })
  await page.waitForSelector('.category-card', { timeout: 15000 })
  return Date.now() - start
}

/**
 * Vote on a single category by expanding it and clicking a random nominee.
 * Returns { categoryName, nomineeName, latencyMs }.
 */
export async function voteOnCategory(page, categoryIndex) {
  const cards = page.locator('.category-card')
  const card = cards.nth(categoryIndex)

  // Expand the category by clicking the header
  const header = card.locator('.category-header')
  const expanded = await header.getAttribute('aria-expanded')
  if (expanded !== 'true') {
    await header.click()
    await card.locator('.nominee-list').waitFor({ timeout: 5000 })
  }

  const categoryName = await card.locator('.category-header h3').innerText()

  // Check if category is locked
  const isLocked = await card.evaluate(el => el.classList.contains('locked'))
  if (isLocked) {
    return { categoryName, nomineeName: null, latencyMs: 0, skipped: true }
  }

  // Pick a random nominee that isn't already selected
  const nominees = card.locator('.nominee:not(.selected)')
  const count = await nominees.count()
  if (count === 0) {
    return { categoryName, nomineeName: null, latencyMs: 0, skipped: true }
  }

  const randomIndex = Math.floor(Math.random() * count)
  const nominee = nominees.nth(randomIndex)
  const nomineeName = await nominee.locator('.nominee-name').innerText()

  const start = Date.now()
  await nominee.click()

  // Wait for the "Your pick" badge to appear on this nominee
  await card.locator('.vote-badge').waitFor({ timeout: 10000 })
  const latencyMs = Date.now() - start

  return { categoryName, nomineeName, latencyMs, skipped: false }
}

/**
 * Navigate to the leaderboard and return the list of guest names shown.
 */
export async function getLeaderboardNames(page) {
  await page.click('.nav-bar a:has-text("Leaderboard")')
  await page.waitForSelector('.rank-row', { timeout: 15000 })
  const names = await page.locator('.guest-name').allInnerTexts()
  return names
}

/**
 * Navigate to the You page and return the number of votes shown.
 */
export async function getYouPageVoteCount(page) {
  await page.click('.nav-bar a:has-text("You")')
  await page.waitForSelector('.vote-summary', { timeout: 10000 })
  const headerText = await page.locator('h2').innerText()
  // Format: "Your Votes (X / Y)"
  const match = headerText.match(/\((\d+)\s*\/\s*(\d+)\)/)
  return match ? { voted: parseInt(match[1], 10), total: parseInt(match[2], 10) } : null
}

/**
 * Navigate back to the ballot page.
 */
export async function goToBallot(page) {
  await page.click('.nav-bar a:has-text("Ballot")')
  await page.waitForSelector('.category-card', { timeout: 10000 })
}

/**
 * Wait for a winner badge to appear on a specific category card.
 * Returns the time (ms) until the badge is visible.
 */
export async function waitForWinnerOnCategory(page, categoryIndex, timeoutMs = 10000) {
  const card = page.locator('.category-card').nth(categoryIndex)
  const start = Date.now()

  // The card gets the 'announced' class when a winner is set
  await card.locator('.winner-badge').waitFor({ timeout: timeoutMs })
  return Date.now() - start
}

/**
 * Read the score from the ScoreIndicator on the ballot page.
 * Returns { correct, total } parsed from "X / Y".
 */
export async function getScore(page) {
  const text = await page.locator('.score-indicator').innerText()
  const match = text.match(/(\d+)\s*\/\s*(\d+)/)
  return match ? { correct: parseInt(match[1], 10), total: parseInt(match[2], 10) } : null
}
```

**Step 2: Commit**

```bash
git add e2e/helpers/guest.js
git commit -m "feat: add guest helper with join, vote, and verification actions"
```

---

### Task 4: Build the host helper

**Files:**
- Modify: `e2e/helpers/host.js`

The host joins the party like a guest, then activates host mode via the PIN prompt, then can lock categories and select winners.

**Key selectors** (from reading HostModeToggle.jsx and CategoryCard.jsx):
- Host mode button: `button.host-mode-link` (text "Host Mode")
- PIN input: `.host-prompt input[type="password"]`
- Activate button: `.host-prompt button:has-text("Activate")`
- Host banner: `.host-banner` (confirms host mode is active)
- Lock button per category: `.host-controls .btn-small:has-text("Lock")`
- Set Winner buttons: `.btn-winner` (text "Set Winner", one per nominee)

**Step 1: Implement host helper**

Write `e2e/helpers/host.js`:
```js
import { joinParty as guestJoin } from './guest.js'

/**
 * Join the party and activate host mode using the PIN.
 */
export async function joinAsHost(page, partyUrl, hostPin) {
  const joinMs = await guestJoin(page, partyUrl, 'Host Bot')

  // Click "Host Mode" link at the bottom of the ballot
  await page.click('button.host-mode-link')
  await page.waitForSelector('.host-prompt', { timeout: 5000 })

  // Enter PIN and activate
  await page.fill('.host-prompt input[type="password"]', hostPin)
  await page.click('.host-prompt button:has-text("Activate")')

  // Wait for host banner to confirm activation
  await page.waitForSelector('.host-banner', { timeout: 10000 })

  return joinMs
}

/**
 * Lock a category by index. Expands the card if needed, then clicks Lock.
 */
export async function lockCategory(page, categoryIndex) {
  const card = page.locator('.category-card').nth(categoryIndex)

  // Expand if collapsed
  const header = card.locator('.category-header')
  const expanded = await header.getAttribute('aria-expanded')
  if (expanded !== 'true') {
    await header.click()
    await card.locator('.nominee-list').waitFor({ timeout: 5000 })
  }

  const lockBtn = card.locator('.host-controls .btn-small:has-text("Lock")')
  // Only click if it says "Lock" (not "Unlock")
  if (await lockBtn.count() > 0) {
    await lockBtn.click()
    // Wait for the card to show the locked state
    await card.locator('.locked').or(page.locator(`[class*="locked"]`)).waitFor({ timeout: 5000 }).catch(() => {})
    // Small delay for Firestore write to propagate
    await page.waitForTimeout(500)
  }
}

/**
 * Select a winner for a category by index. Picks the first nominee's "Set Winner" button.
 * The category should already be expanded from lockCategory.
 * Returns the name of the selected winner.
 */
export async function selectWinner(page, categoryIndex, nomineeIndex = 0) {
  const card = page.locator('.category-card').nth(categoryIndex)

  // Expand if collapsed
  const header = card.locator('.category-header')
  const expanded = await header.getAttribute('aria-expanded')
  if (expanded !== 'true') {
    await header.click()
    await card.locator('.nominee-list').waitFor({ timeout: 5000 })
  }

  const nominees = card.locator('.nominee')
  const nominee = nominees.nth(nomineeIndex)
  const winnerName = await nominee.locator('.nominee-name').innerText()

  await nominee.locator('.btn-winner').click()

  // Wait for winner badge to appear
  await card.locator('.winner-badge').waitFor({ timeout: 10000 })

  return winnerName
}

/**
 * Get the total number of category cards on the ballot.
 */
export async function getCategoryCount(page) {
  return await page.locator('.category-card').count()
}
```

**Step 2: Commit**

```bash
git add e2e/helpers/host.js
git commit -m "feat: add host helper with PIN activation, lock, and winner selection"
```

---

### Task 5: Wire up the orchestrator - Phase 1 (Setup) and Phase 2 (Guest Joins)

**Files:**
- Modify: `e2e/load-test.js`

**Step 1: Implement phases 1 and 2**

Replace the contents of `e2e/load-test.js`:
```js
import { chromium } from 'playwright'
import { parseArgs } from 'node:util'
import { Metrics } from './helpers/metrics.js'
import { joinAsHost, getCategoryCount } from './helpers/host.js'
import { joinParty, voteOnCategory, getLeaderboardNames, goToBallot, getScore } from './helpers/guest.js'

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    'host-pin': { type: 'string' },
    guests: { type: 'string', default: '10' },
    headed: { type: 'boolean', default: false },
  },
})

if (!values.url || !values['host-pin']) {
  console.error('Usage: node e2e/load-test.js --url <partyUrl> --host-pin <pin> [--guests N] [--headed]')
  process.exit(1)
}

const config = {
  url: values.url,
  hostPin: values['host-pin'],
  numGuests: parseInt(values.guests, 10),
  headed: values.headed,
}

const metrics = new Metrics()

console.log(`\nLoad test: ${config.numGuests} guests against ${config.url}\n`)

const browser = await chromium.launch({ headless: !config.headed })

try {
  // === Phase 1: Host Setup ===
  metrics.startPhase('Host setup')
  console.log('[Phase 1] Host joining and activating host mode...')
  const hostContext = await browser.newContext()
  const hostPage = await hostContext.newPage()
  const hostJoinMs = await joinAsHost(hostPage, config.url, config.hostPin)
  metrics.recordLatency('Join', hostJoinMs)
  const categoryCount = await getCategoryCount(hostPage)
  console.log(`  Host joined. ${categoryCount} categories found.`)
  metrics.endPhase()

  // === Phase 2: Guests Join ===
  metrics.startPhase('Guest joins')
  console.log(`[Phase 2] ${config.numGuests} guests joining...`)

  const guestContexts = []
  const guestPages = []

  const joinPromises = Array.from({ length: config.numGuests }, async (_, i) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const name = `Guest ${i + 1}`
    const joinMs = await joinParty(page, config.url, name)
    metrics.recordLatency('Join', joinMs)
    console.log(`  ${name} joined (${joinMs}ms)`)
    return { ctx, page, name }
  })

  const results = await Promise.all(joinPromises)
  for (const r of results) {
    guestContexts.push(r.ctx)
    guestPages.push(r.page)
  }

  // Verify all guests appear on leaderboard
  const leaderboardNames = await getLeaderboardNames(guestPages[0])
  const expectedCount = config.numGuests + 1 // guests + host
  metrics.assert(
    `Leaderboard shows ${expectedCount} participants`,
    leaderboardNames.length >= expectedCount
  )
  console.log(`  Leaderboard shows ${leaderboardNames.length} participants (expected ${expectedCount})`)

  // Navigate first guest back to ballot for voting phase
  await goToBallot(guestPages[0])
  metrics.endPhase()

  // === Phases 3-4 happen in next tasks ===

  console.log('\n[Phases 3-4] Not yet implemented.\n')

  // === Reporting ===
  const allPassed = metrics.report()

  // Cleanup
  for (const ctx of guestContexts) await ctx.close()
  await hostContext.close()
  await browser.close()

  process.exit(allPassed ? 0 : 1)
} catch (err) {
  console.error('\nFatal error:', err)
  await browser.close()
  process.exit(1)
}
```

**Step 2: Manual test with 2 guests against a real party**

Start the dev server, create a party manually, then run:

```bash
npm run dev &
node e2e/load-test.js --url http://localhost:5173/<YOUR_PARTY_CODE> --host-pin <YOUR_PIN> --guests 2 --headed
```

Expected: Two browser windows open, both join the party, leaderboard check passes.

**Step 3: Commit**

```bash
git add e2e/load-test.js
git commit -m "feat: wire up load test phases 1-2 (host setup + guest joins)"
```

---

### Task 6: Wire up Phase 3 (Voting)

**Files:**
- Modify: `e2e/load-test.js`

**Step 1: Add voting phase after Phase 2**

In `e2e/load-test.js`, replace the `// === Phases 3-4 happen in next tasks ===` placeholder with:

```js
  // === Phase 3: Voting ===
  metrics.startPhase('Voting')
  console.log(`[Phase 3] Guests voting across ${categoryCount} categories...`)

  for (let catIdx = 0; catIdx < categoryCount; catIdx++) {
    const votePromises = guestPages.map(async (page, guestIdx) => {
      try {
        const result = await voteOnCategory(page, catIdx)
        if (!result.skipped) {
          metrics.recordLatency('Vote', result.latencyMs)
        }
        return result
      } catch (err) {
        const guestName = `Guest ${guestIdx + 1}`
        console.error(`  [ERROR] ${guestName} failed voting on category ${catIdx}: ${err.message}`)
        metrics.assert(`${guestName} votes on category ${catIdx}`, false)
        return { skipped: true }
      }
    })

    const voteResults = await Promise.all(votePromises)
    const voted = voteResults.filter(r => !r.skipped).length
    const catName = voteResults.find(r => r.categoryName)?.categoryName || `Category ${catIdx}`
    if (voted > 0) {
      console.log(`  ${catName}: ${voted}/${config.numGuests} guests voted`)
    }
  }

  metrics.endPhase()
```

**Step 2: Verify votes on the You page for a sample guest**

After the voting phase, add this verification before the reporting section:

```js
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

**Step 3: Manual test**

```bash
node e2e/load-test.js --url http://localhost:5173/<CODE> --host-pin <PIN> --guests 3 --headed
```

Expected: All 3 guests vote on all unlocked categories. Console shows per-category vote counts.

**Step 4: Commit**

```bash
git add e2e/load-test.js
git commit -m "feat: add voting phase with concurrent guest votes and latency tracking"
```

---

### Task 7: Wire up Phase 4 (Winner Announcements + Propagation)

**Files:**
- Modify: `e2e/load-test.js`
- Modify: `e2e/helpers/guest.js` (import `waitForWinnerOnCategory`)

**Step 1: Add winner announcement phase**

In `e2e/load-test.js`, add Phase 4 after the voting verification:

```js
  // === Phase 4: Host Announces Winners ===
  metrics.startPhase('Winner announcements')
  // Only announce a subset of categories to keep test time reasonable
  const categoriesToAnnounce = Math.min(categoryCount, 5)
  console.log(`[Phase 4] Host announcing winners for ${categoriesToAnnounce} categories...`)

  const { lockCategory, selectWinner } = await import('./helpers/host.js')
  const { waitForWinnerOnCategory } = await import('./helpers/guest.js')

  for (let catIdx = 0; catIdx < categoriesToAnnounce; catIdx++) {
    // Host locks the category
    await lockCategory(hostPage, catIdx)

    // Host selects winner (first nominee)
    const winnerName = await selectWinner(hostPage, catIdx)
    console.log(`  Category ${catIdx}: winner = ${winnerName}`)

    // Measure propagation to all guests
    const propagationPromises = guestPages.map(async (page, guestIdx) => {
      try {
        const propMs = await waitForWinnerOnCategory(page, catIdx, 10000)
        metrics.recordLatency('Propagation', propMs)
        return propMs
      } catch (err) {
        console.error(`  [ERROR] Guest ${guestIdx + 1} did not see winner for category ${catIdx}`)
        metrics.assert(`Guest ${guestIdx + 1} sees winner for category ${catIdx}`, false)
        return null
      }
    })

    const propResults = await Promise.all(propagationPromises)
    const successCount = propResults.filter(r => r !== null).length
    const avgMs = propResults.filter(r => r !== null).reduce((s, v) => s + v, 0) / successCount
    console.log(`    ${successCount}/${config.numGuests} guests saw update (avg ${Math.round(avgMs)}ms)`)
  }

  // Final assertion: check scores are consistent
  for (let guestIdx = 0; guestIdx < guestPages.length; guestIdx++) {
    const score = await getScore(guestPages[guestIdx])
    if (score) {
      metrics.assert(
        `Guest ${guestIdx + 1} score <= ${categoriesToAnnounce} announced`,
        score.correct <= categoriesToAnnounce && score.total === categoriesToAnnounce
      )
    }
  }

  // Check leaderboard final state
  const finalNames = await getLeaderboardNames(guestPages[0])
  metrics.assert(
    `Final leaderboard shows all ${expectedCount} participants`,
    finalNames.length >= expectedCount
  )
  console.log(`  Final leaderboard: ${finalNames.length} participants`)

  await goToBallot(guestPages[0])
  metrics.endPhase()
```

**Step 2: Update the placeholder removal**

Remove the line `console.log('\n[Phases 3-4] Not yet implemented.\n')` that was added in Task 5.

**Step 3: Manual test with full flow**

```bash
node e2e/load-test.js --url http://localhost:5173/<CODE> --host-pin <PIN> --guests 3 --headed
```

Expected: Host locks and announces winners for 5 categories. All guests see updates. Final report shows propagation latencies.

**Step 4: Commit**

```bash
git add e2e/load-test.js
git commit -m "feat: add winner announcement phase with propagation latency tracking"
```

---

### Task 8: Add screenshot-on-failure and error resilience

**Files:**
- Modify: `e2e/load-test.js`

**Step 1: Create screenshots directory**

Add to the top of `e2e/load-test.js`, after imports:
```js
import { mkdir } from 'node:fs/promises'
const SCREENSHOT_DIR = new URL('./screenshots', import.meta.url).pathname
await mkdir(SCREENSHOT_DIR, { recursive: true })
```

**Step 2: Add screenshot helper function**

Add after the `config` declaration:
```js
async function screenshotOnError(page, label) {
  try {
    const filename = `${label.replace(/\s+/g, '-')}-${Date.now()}.png`
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${filename}`, fullPage: true })
    console.log(`  Screenshot saved: e2e/screenshots/${filename}`)
  } catch {
    // Screenshot failed, continue
  }
}
```

**Step 3: Wrap guest vote errors with screenshots**

In the Phase 3 voting loop, update the catch block:
```js
      } catch (err) {
        const guestName = `Guest ${guestIdx + 1}`
        console.error(`  [ERROR] ${guestName} failed voting on category ${catIdx}: ${err.message}`)
        metrics.assert(`${guestName} votes on category ${catIdx}`, false)
        await screenshotOnError(page, `${guestName}-cat${catIdx}`)
        return { skipped: true }
      }
```

**Step 4: Wrap propagation errors with screenshots**

In the Phase 4 propagation loop, update the catch block:
```js
      } catch (err) {
        console.error(`  [ERROR] Guest ${guestIdx + 1} did not see winner for category ${catIdx}`)
        metrics.assert(`Guest ${guestIdx + 1} sees winner for category ${catIdx}`, false)
        await screenshotOnError(guestPages[guestIdx], `propagation-guest${guestIdx + 1}-cat${catIdx}`)
        return null
      }
```

**Step 5: Add `e2e/screenshots/` to `.gitignore`**

Append to `.gitignore`:
```
e2e/screenshots/
```

**Step 6: Commit**

```bash
git add e2e/load-test.js .gitignore
git commit -m "feat: add screenshot-on-failure and gitignore screenshots dir"
```

---

### Task 9: Add configurable category announcement count

**Files:**
- Modify: `e2e/load-test.js`

Currently Phase 4 hardcodes `Math.min(categoryCount, 5)`. Add a CLI flag to control this.

**Step 1: Add `--categories` CLI option**

Update the `parseArgs` options:
```js
    categories: { type: 'string', default: '5' },
```

Update the `config` object:
```js
  categoriesToAnnounce: Math.min(parseInt(values.categories, 10), categoryCount),
```

Note: `categoryCount` isn't available yet at config time, so instead store the raw value:
```js
  categoriesToAnnounce: parseInt(values.categories, 10),
```

Then in Phase 4, change:
```js
  const categoriesToAnnounce = Math.min(config.categoriesToAnnounce, categoryCount)
```

**Step 2: Update the usage message**

```js
  console.error('Usage: node e2e/load-test.js --url <partyUrl> --host-pin <pin> [--guests N] [--categories N] [--headed]')
```

**Step 3: Update the opening log line**

```js
console.log(`\nLoad test: ${config.numGuests} guests, ${config.categoriesToAnnounce} winners against ${config.url}\n`)
```

**Step 4: Commit**

```bash
git add e2e/load-test.js
git commit -m "feat: add --categories flag to control winner announcement count"
```

---

### Task 10: End-to-end manual test and final cleanup

**Files:**
- Review: all `e2e/` files

**Step 1: Run a full test with 5 guests**

```bash
npm run dev &
# Create a party manually in the browser, note the party code and PIN
node e2e/load-test.js --url http://localhost:5173/<CODE> --host-pin <PIN> --guests 5 --categories 3 --headed
```

Expected full output:
```
Load test: 5 guests, 3 winners against http://localhost:5173/<CODE>

[Phase 1] Host joining and activating host mode...
  Host joined. 24 categories found.
[Phase 2] 5 guests joining...
  Guest 1 joined (XXms)
  ...
  Leaderboard shows 6 participants (expected 6)
[Phase 3] Guests voting across 24 categories...
  Best Picture: 5/5 guests voted
  ...
[Phase 4] Host announcing winners for 3 categories...
  Category 0: winner = <name>
    5/5 guests saw update (avg XXms)
  ...
  Final leaderboard: 6 participants

=== Load Test Results ===
Duration: XX.Xs

Phase Timing:
  ...

Latency (ms):
  ...

Assertions: X passed, 0 failed
```

**Step 2: Run headless with 10 guests to stress test**

```bash
node e2e/load-test.js --url http://localhost:5173/<CODE> --host-pin <PIN> --guests 10 --categories 5
```

Verify it completes without errors.

**Step 3: Final commit**

```bash
git add -A e2e/
git commit -m "chore: finalize load test script"
```

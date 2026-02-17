import { chromium } from 'playwright'
import { parseArgs } from 'node:util'
import { mkdir } from 'node:fs/promises'
import { Metrics } from './helpers/metrics.js'
import { joinAsHost, getCategoryCount } from './helpers/host.js'
import { joinParty, voteOnCategory, getLeaderboardNames, goToBallot, getScore, waitForAnnouncedCount } from './helpers/guest.js'

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    'host-pin': { type: 'string' },
    guests: { type: 'string', default: '10' },
    categories: { type: 'string', default: '5' },
    headed: { type: 'boolean', default: false },
  },
})

if (!values.url || !values['host-pin']) {
  console.error('Usage: node e2e/load-test.js --url <partyUrl> --host-pin <pin> [--guests N] [--categories N] [--headed]')
  process.exit(1)
}

const config = {
  url: values.url,
  hostPin: values['host-pin'],
  numGuests: parseInt(values.guests, 10),
  categoriesToAnnounce: parseInt(values.categories, 10),
  headed: values.headed,
}

const SCREENSHOT_DIR = new URL('./screenshots', import.meta.url).pathname
await mkdir(SCREENSHOT_DIR, { recursive: true })

async function screenshotOnError(page, label) {
  try {
    const filename = `${label.replace(/\s+/g, '-')}-${Date.now()}.png`
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${filename}`, fullPage: true })
    console.log(`  Screenshot saved: e2e/screenshots/${filename}`)
  } catch {
    // Screenshot failed, continue
  }
}

const metrics = new Metrics()

console.log(`\nLoad test: ${config.numGuests} guests against ${config.url}`)
console.log()

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
  const expectedCount = config.numGuests + 1 // guests + host
  const leaderboardNames = await getLeaderboardNames(guestPages[0], expectedCount)
  metrics.assert(
    `Leaderboard shows ${expectedCount} participants`,
    leaderboardNames.length >= expectedCount
  )
  console.log(`  Leaderboard shows ${leaderboardNames.length} participants (expected ${expectedCount})`)

  // Navigate first guest back to ballot for voting phase
  await goToBallot(guestPages[0])
  metrics.endPhase()

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
        await screenshotOnError(page, `${guestName}-cat${catIdx}`)
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

  // === Phase 4: Winner Propagation (interactive) ===
  if (config.pauseForWinners) {
    const categoriesToAnnounce = Math.min(config.categoriesToAnnounce, categoryCount)

    console.log(`\n[Phase 4] Waiting for you to announce winners...`)
    console.log(`  Go to the app and select winners for ${categoriesToAnnounce} categories.`)
    console.log(`  (Lock the category first, then pick a winner.)`)
    await waitForEnter(`\n  Press Enter when you've announced ${categoriesToAnnounce} winners... `)

    metrics.startPhase('Winner propagation')
    console.log(`  Checking ${config.numGuests} guest browsers for ${categoriesToAnnounce} announced categories...`)

    // Check each guest sees at least N announced categories (any categories, any order)
    const propagationPromises = guestPages.map(async (page, guestIdx) => {
      try {
        const propMs = await waitForAnnouncedCount(page, categoriesToAnnounce, 15000)
        metrics.recordLatency('Propagation', propMs)
        metrics.assert(`Guest ${guestIdx + 1} sees ${categoriesToAnnounce} winners`, true)
        return propMs
      } catch {
        const actual = await page.locator('.category-card.announced').count()
        console.error(`  [MISS] Guest ${guestIdx + 1} saw ${actual}/${categoriesToAnnounce} winners`)
        metrics.assert(`Guest ${guestIdx + 1} sees ${categoriesToAnnounce} winners`, false)
        await screenshotOnError(page, `propagation-guest${guestIdx + 1}`)
        return null
      }
    })

    const propResults = await Promise.all(propagationPromises)
    const successCount = propResults.filter(r => r !== null).length
    if (successCount > 0) {
      const avgMs = propResults.filter(r => r !== null).reduce((s, v) => s + v, 0) / successCount
      console.log(`  ${successCount}/${config.numGuests} guests saw all ${categoriesToAnnounce} winners (avg ${Math.round(avgMs)}ms)`)
    }

    // Verify scores match
    for (let guestIdx = 0; guestIdx < guestPages.length; guestIdx++) {
      const score = await getScore(guestPages[guestIdx])
      if (score) {
        metrics.assert(
          `Guest ${guestIdx + 1} score total matches announced`,
          score.total >= categoriesToAnnounce
        )
      }
    }

    metrics.endPhase()
  } else {
    console.log('[Phase 4] Skipped (use --pause-for-winners for interactive winner verification)')
  }

  // Check leaderboard final state
  const finalNames = await getLeaderboardNames(guestPages[0], expectedCount)
  metrics.assert(
    `Final leaderboard shows all ${expectedCount} participants`,
    finalNames.length >= expectedCount
  )
  console.log(`  Final leaderboard: ${finalNames.length} participants`)

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

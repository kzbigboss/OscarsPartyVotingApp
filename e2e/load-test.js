import { chromium } from 'playwright'
import { parseArgs } from 'node:util'
import { mkdir } from 'node:fs/promises'
import { Metrics } from './helpers/metrics.js'
import { joinAsHost, getCategoryCount, lockCategory, selectWinner } from './helpers/host.js'
import { joinParty, voteOnCategory, getLeaderboardNames, goToBallot, getScore, waitForAnnouncedCount, getYouPageResults } from './helpers/guest.js'

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
      } else {
        metrics.assert(`${guestLabel} score indicator is readable`, false)
        console.log(`  ${guestLabel}: score indicator not found or format changed`)
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
      metrics.assert(
        `${guestLabel} correct + wrong equals announced count`,
        correctCount + wrongCount === announcedResults.length
      )
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

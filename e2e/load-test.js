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

  // === Phase 4 happens in next task ===

  console.log('\n[Phase 4] Not yet implemented.\n')

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

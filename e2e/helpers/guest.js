/**
 * Join the party by entering a display name on the Join page.
 * Returns the time (ms) from form submission to ballot page load.
 */
export async function joinParty(page, partyUrl, displayName) {
  const start = Date.now()
  await page.goto(partyUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="Your name"]', { timeout: 15000 })
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
export async function getLeaderboardNames(page, expectedCount = 0) {
  await page.click('.nav-bar a:has-text("Leaderboard")')
  await page.waitForSelector('.rank-row', { timeout: 15000 })

  // If we expect a specific count, poll briefly for Firestore propagation
  if (expectedCount > 0) {
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      const count = await page.locator('.rank-row').count()
      if (count >= expectedCount) break
      await page.waitForTimeout(500)
    }
  }

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
    const classes = (await row.getAttribute('class')) || ''
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

/**
 * Navigate back to the ballot page.
 */
export async function goToBallot(page) {
  await page.click('.nav-bar a:has-text("Ballot")')
  await page.waitForSelector('.category-card', { timeout: 10000 })
}

/**
 * Wait for at least `expectedCount` categories to have the 'announced' class.
 * Returns the time (ms) until the count is reached.
 */
export async function waitForAnnouncedCount(page, expectedCount, timeoutMs = 15000) {
  const start = Date.now()

  await page.waitForFunction(
    (n) => document.querySelectorAll('.category-card.announced').length >= n,
    expectedCount,
    { timeout: timeoutMs }
  )
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

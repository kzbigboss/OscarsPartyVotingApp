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

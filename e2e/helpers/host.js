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

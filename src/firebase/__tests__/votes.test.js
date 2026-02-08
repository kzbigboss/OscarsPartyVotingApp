import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { castVote } from '../votes'
import { setDoc } from 'firebase/firestore'

describe('votes', () => {
  it('castVote writes a vote document keyed by guestId_categoryId', async () => {
    setDoc.mockResolvedValue()
    await castVote('ABC123', 'guest1', 'cat1', 'nom1')
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        guestId: 'guest1',
        categoryId: 'cat1',
        nomineeId: 'nom1',
      })
    )
  })
})

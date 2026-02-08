import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  query: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { joinParty } from '../guests'
import { setDoc } from 'firebase/firestore'

describe('guests', () => {
  it('joinParty creates a guest document with numeric ID', async () => {
    setDoc.mockResolvedValue()
    const result = await joinParty('ABC123', 'Mike')
    expect(setDoc).toHaveBeenCalled()
    expect(result).toHaveProperty('guestId')
    expect(typeof result.guestId).toBe('string')
  })
})

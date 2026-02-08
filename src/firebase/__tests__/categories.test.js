import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => 'mock-doc-ref'),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(),
  })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { seedCategories, lockCategory, unlockCategory, selectWinner } from '../categories'
import { writeBatch, updateDoc } from 'firebase/firestore'

describe('categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('seedCategories uses a batch write', async () => {
    const mockBatch = { set: vi.fn(), commit: vi.fn() }
    writeBatch.mockReturnValue(mockBatch)
    await seedCategories('ABC123', [{ name: 'Best Picture', sortOrder: 1, nominees: [] }])
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it('lockCategory sets locked to true', async () => {
    updateDoc.mockResolvedValue()
    await lockCategory('ABC123', 'cat1')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { locked: true }
    )
  })

  it('selectWinner sets winnerId and locks the category', async () => {
    updateDoc.mockResolvedValue()
    await selectWinner('ABC123', 'cat1', 'nom1')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { winnerId: 'nom1', locked: true }
    )
  })
})

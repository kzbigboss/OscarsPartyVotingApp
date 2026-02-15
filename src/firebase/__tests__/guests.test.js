import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => 'mock-doc-ref'),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  query: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { joinParty } from '../guests'
import { getDoc, setDoc } from 'firebase/firestore'

describe('guests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('joinParty creates a guest document with numeric ID', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    const result = await joinParty('ABC123', 'Mike')
    expect(getDoc).toHaveBeenCalled()
    expect(setDoc).toHaveBeenCalled()
    expect(result).toHaveProperty('guestId')
    expect(typeof result.guestId).toBe('string')
  })

  it('retries on guest ID collision and succeeds', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => false })
    setDoc.mockResolvedValue()
    const result = await joinParty('ABC123', 'Alice')
    expect(getDoc).toHaveBeenCalledTimes(2)
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(result).toHaveProperty('guestId')
    expect(typeof result.guestId).toBe('string')
  })

  it('throws when all retries are exhausted', async () => {
    getDoc.mockResolvedValue({ exists: () => true })
    await expect(joinParty('ABC123', 'Bob')).rejects.toThrow(
      'Could not generate a unique guest ID. Party may be full.'
    )
    expect(getDoc).toHaveBeenCalledTimes(10)
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('joinParty sets isHost to true when passed', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    await joinParty('ABC123', 'Alice', true)
    const storedData = setDoc.mock.calls[0][1]
    expect(storedData).toHaveProperty('isHost', true)
  })

  it('joinParty defaults isHost to false when not passed', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    await joinParty('ABC123', 'Bob')
    const storedData = setDoc.mock.calls[0][1]
    expect(storedData).toHaveProperty('isHost', false)
  })
})

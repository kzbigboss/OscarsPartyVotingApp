import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { createParty, getParty } from '../parties'
import { setDoc, getDoc } from 'firebase/firestore'

describe('parties', () => {
  it('createParty generates a party code and writes to firestore', async () => {
    setDoc.mockResolvedValue()
    const result = await createParty('Test Party', '1234')
    expect(setDoc).toHaveBeenCalled()
    expect(result).toHaveProperty('partyCode')
    expect(result.partyCode).toHaveLength(6)
  })

  it('getParty fetches a party by code', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Test Party', hostPin: '1234' }),
    })
    const party = await getParty('ABC123')
    expect(getDoc).toHaveBeenCalled()
    expect(party.name).toBe('Test Party')
  })

  it('getParty returns null for non-existent party', async () => {
    getDoc.mockResolvedValue({
      exists: () => false,
    })
    const party = await getParty('NOPE00')
    expect(party).toBeNull()
  })
})

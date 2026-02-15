import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => 'mock-doc-ref'),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { createParty, getParty, hashPin } from '../parties'
import { setDoc, getDoc, doc } from 'firebase/firestore'

describe('parties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createParty checks for existing party before writing', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    const result = await createParty('Test Party', '1234')
    expect(getDoc).toHaveBeenCalledTimes(1)
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(result).toHaveProperty('partyCode')
    expect(result.partyCode).toHaveLength(6)
  })

  it('createParty retries on collision and succeeds', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => false })
    setDoc.mockResolvedValue()
    const result = await createParty('Test Party', '1234')
    expect(getDoc).toHaveBeenCalledTimes(2)
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(result).toHaveProperty('partyCode')
    expect(result.partyCode).toHaveLength(6)
  })

  it('createParty throws after max collision attempts', async () => {
    getDoc.mockResolvedValue({ exists: () => true })
    await expect(createParty('Test Party', '1234')).rejects.toThrow(
      'Failed to generate a unique party code after multiple attempts'
    )
    expect(getDoc).toHaveBeenCalledTimes(3)
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('createParty stores hostPinHash instead of raw hostPin', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    await createParty('Test Party', '1234')
    const storedData = setDoc.mock.calls[0][1]
    expect(storedData).not.toHaveProperty('hostPin')
    expect(storedData).toHaveProperty('hostPinHash')
    expect(storedData.hostPinHash).not.toBe('1234')
    expect(storedData.hostPinHash).toHaveLength(64)
  })

  it('hashPin returns a consistent SHA-256 hex string', async () => {
    const hash1 = await hashPin('1234')
    const hash2 = await hashPin('1234')
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
    expect(hash1).not.toBe('1234')
  })

  it('hashPin produces different hashes for different inputs', async () => {
    const hash1 = await hashPin('1234')
    const hash2 = await hashPin('5678')
    expect(hash1).not.toBe(hash2)
  })

  it('getParty fetches a party by code', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Test Party', hostPinHash: 'abc123hash' }),
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

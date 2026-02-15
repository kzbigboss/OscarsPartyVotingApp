import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

let onSnapshotCallback
let onSnapshotErrorCallback
const mockUnsub = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  onSnapshot: vi.fn((ref, successCb, errorCb) => {
    onSnapshotCallback = successCb
    onSnapshotErrorCallback = errorCb
    return mockUnsub
  }),
}))

vi.mock('../../firebase/config', () => ({
  db: {},
}))

import { useParty } from '../useParty'
import { doc, onSnapshot } from 'firebase/firestore'

describe('useParty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onSnapshotCallback = null
    onSnapshotErrorCallback = null
  })

  it('starts with loading true and null party', () => {
    const { result } = renderHook(() => useParty('ABC123'))
    expect(result.current.loading).toBe(true)
    expect(result.current.party).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns party data when snapshot exists and sets loading to false', () => {
    const { result } = renderHook(() => useParty('ABC123'))

    act(() => {
      onSnapshotCallback({
        exists: () => true,
        data: () => ({ name: 'Oscar Night 2026', hostPinHash: 'abc123' }),
      })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.party).toEqual({ name: 'Oscar Night 2026', hostPinHash: 'abc123' })
    expect(result.current.error).toBeNull()
  })

  it('returns null party when snapshot does not exist', () => {
    const { result } = renderHook(() => useParty('ABC123'))

    act(() => {
      onSnapshotCallback({
        exists: () => false,
        data: () => null,
      })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.party).toBeNull()
  })

  it('sets up onSnapshot with correct doc path', () => {
    renderHook(() => useParty('ABC123'))
    expect(doc).toHaveBeenCalledWith({}, 'parties', 'ABC123')
    expect(onSnapshot).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('returns unsubscribe function for cleanup on unmount', () => {
    const { unmount } = renderHook(() => useParty('ABC123'))
    unmount()
    expect(mockUnsub).toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is falsy', () => {
    renderHook(() => useParty(null))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is undefined', () => {
    renderHook(() => useParty(undefined))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is empty string', () => {
    renderHook(() => useParty(''))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('handles error callback by setting error and loading to false', () => {
    const { result } = renderHook(() => useParty('ABC123'))
    const testError = new Error('Firestore error')

    act(() => {
      onSnapshotErrorCallback(testError)
    })

    expect(result.current.error).toBe(testError)
    expect(result.current.loading).toBe(false)
  })

  it('clears error when new data arrives after an error', () => {
    const { result } = renderHook(() => useParty('ABC123'))

    act(() => {
      onSnapshotErrorCallback(new Error('Temporary error'))
    })
    expect(result.current.error).not.toBeNull()

    act(() => {
      onSnapshotCallback({
        exists: () => true,
        data: () => ({ name: 'Test Party' }),
      })
    })
    expect(result.current.error).toBeNull()
  })
})

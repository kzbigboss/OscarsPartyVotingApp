import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

let onSnapshotCallback
let onSnapshotErrorCallback
const mockUnsub = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  onSnapshot: vi.fn((ref, successCb, errorCb) => {
    onSnapshotCallback = successCb
    onSnapshotErrorCallback = errorCb
    return mockUnsub
  }),
}))

vi.mock('../../firebase/config', () => ({
  db: {},
}))

import { useVotes } from '../useVotes'
import { collection, onSnapshot } from 'firebase/firestore'

describe('useVotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onSnapshotCallback = null
    onSnapshotErrorCallback = null
  })

  it('starts with loading true and empty votes', () => {
    const { result } = renderHook(() => useVotes('ABC123'))
    expect(result.current.loading).toBe(true)
    expect(result.current.votes).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns data from onSnapshot callback and sets loading to false', () => {
    const { result } = renderHook(() => useVotes('ABC123'))

    act(() => {
      onSnapshotCallback({
        docs: [
          { id: 'vote1', data: () => ({ guestId: '100', categoryId: 'bp', nomineeId: 'n1' }) },
          { id: 'vote2', data: () => ({ guestId: '101', categoryId: 'bp', nomineeId: 'n2' }) },
        ],
      })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.votes).toEqual([
      { id: 'vote1', guestId: '100', categoryId: 'bp', nomineeId: 'n1' },
      { id: 'vote2', guestId: '101', categoryId: 'bp', nomineeId: 'n2' },
    ])
    expect(result.current.error).toBeNull()
  })

  it('sets up onSnapshot with correct collection path', () => {
    renderHook(() => useVotes('ABC123'))
    expect(collection).toHaveBeenCalledWith({}, 'parties', 'ABC123', 'votes')
    expect(onSnapshot).toHaveBeenCalledWith(
      'mock-collection-ref',
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('returns unsubscribe function for cleanup on unmount', () => {
    const { unmount } = renderHook(() => useVotes('ABC123'))
    unmount()
    expect(mockUnsub).toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is falsy', () => {
    renderHook(() => useVotes(null))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is undefined', () => {
    renderHook(() => useVotes(undefined))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is empty string', () => {
    renderHook(() => useVotes(''))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('handles error callback by setting error and loading to false', () => {
    const { result } = renderHook(() => useVotes('ABC123'))
    const testError = new Error('Firestore error')

    act(() => {
      onSnapshotErrorCallback(testError)
    })

    expect(result.current.error).toBe(testError)
    expect(result.current.loading).toBe(false)
  })

  it('clears error when new data arrives after an error', () => {
    const { result } = renderHook(() => useVotes('ABC123'))

    act(() => {
      onSnapshotErrorCallback(new Error('Temporary error'))
    })
    expect(result.current.error).not.toBeNull()

    act(() => {
      onSnapshotCallback({ docs: [] })
    })
    expect(result.current.error).toBeNull()
  })
})

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
  query: vi.fn((...args) => args[0]),
  orderBy: vi.fn(() => 'mock-order'),
}))

vi.mock('../../firebase/config', () => ({
  db: {},
}))

import { useCategories } from '../useCategories'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onSnapshotCallback = null
    onSnapshotErrorCallback = null
  })

  it('starts with loading true and empty categories', () => {
    const { result } = renderHook(() => useCategories('ABC123'))
    expect(result.current.loading).toBe(true)
    expect(result.current.categories).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns data from onSnapshot callback and sets loading to false', () => {
    const { result } = renderHook(() => useCategories('ABC123'))

    act(() => {
      onSnapshotCallback({
        docs: [
          { id: 'bp', data: () => ({ name: 'Best Picture', sortOrder: 1 }) },
          { id: 'bd', data: () => ({ name: 'Best Director', sortOrder: 2 }) },
        ],
      })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.categories).toEqual([
      { id: 'bp', name: 'Best Picture', sortOrder: 1 },
      { id: 'bd', name: 'Best Director', sortOrder: 2 },
    ])
    expect(result.current.error).toBeNull()
  })

  it('creates query with orderBy sortOrder', () => {
    renderHook(() => useCategories('ABC123'))
    expect(collection).toHaveBeenCalledWith({}, 'parties', 'ABC123', 'categories')
    expect(orderBy).toHaveBeenCalledWith('sortOrder')
    expect(query).toHaveBeenCalledWith('mock-collection-ref', 'mock-order')
  })

  it('returns unsubscribe function for cleanup on unmount', () => {
    const { unmount } = renderHook(() => useCategories('ABC123'))
    unmount()
    expect(mockUnsub).toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is falsy', () => {
    renderHook(() => useCategories(null))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('does not set up listener when partyCode is undefined', () => {
    renderHook(() => useCategories(undefined))
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('handles error callback by setting error and loading to false', () => {
    const { result } = renderHook(() => useCategories('ABC123'))
    const testError = new Error('Firestore error')

    act(() => {
      onSnapshotErrorCallback(testError)
    })

    expect(result.current.error).toBe(testError)
    expect(result.current.loading).toBe(false)
  })

  it('clears error when new data arrives after an error', () => {
    const { result } = renderHook(() => useCategories('ABC123'))

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

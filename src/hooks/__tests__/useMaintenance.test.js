import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

let onSnapshotCallback
let onSnapshotError
const mockUnsubscribe = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  onSnapshot: vi.fn((ref, onNext, onError) => {
    onSnapshotCallback = onNext
    onSnapshotError = onError
    return mockUnsubscribe
  }),
}))

vi.mock('../../firebase/config', () => ({
  db: {},
}))

import { useMaintenance } from '../useMaintenance'
import { doc, onSnapshot } from 'firebase/firestore'

describe('useMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onSnapshotCallback = null
    onSnapshotError = null
  })

  it('starts with loading: true and maintenance: null', () => {
    const { result } = renderHook(() => useMaintenance())
    expect(result.current.loading).toBe(true)
    expect(result.current.maintenance).toBeNull()
  })

  it('listens to config/maintenance document', () => {
    renderHook(() => useMaintenance())
    expect(doc).toHaveBeenCalledWith({}, 'config', 'maintenance')
    expect(onSnapshot).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('returns maintenance data when enabled is true', () => {
    const { result } = renderHook(() => useMaintenance())
    act(() => {
      onSnapshotCallback({
        exists: () => true,
        data: () => ({ enabled: true, message: 'Down for updates' }),
      })
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.maintenance).toEqual({
      enabled: true,
      message: 'Down for updates',
    })
  })

  it('returns maintenance data when enabled is false', () => {
    const { result } = renderHook(() => useMaintenance())
    act(() => {
      onSnapshotCallback({
        exists: () => true,
        data: () => ({ enabled: false }),
      })
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.maintenance).toEqual({ enabled: false })
  })

  it('defaults to enabled: false when document does not exist', () => {
    const { result } = renderHook(() => useMaintenance())
    act(() => {
      onSnapshotCallback({
        exists: () => false,
        data: () => null,
      })
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.maintenance).toEqual({ enabled: false })
  })

  it('defaults to enabled: false on listener error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useMaintenance())
    act(() => {
      onSnapshotError(new Error('permission-denied'))
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.maintenance).toEqual({ enabled: false })
    consoleSpy.mockRestore()
  })

  it('returns unsubscribe function for cleanup', () => {
    const { unmount } = renderHook(() => useMaintenance())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

let authStateCallback
const mockUnsub = vi.fn()

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    authStateCallback = callback
    return mockUnsub
  }),
}))

vi.mock('../../firebase/config', () => ({
  auth: {},
}))

import { useAuth } from '../useAuth'
import { onAuthStateChanged } from 'firebase/auth'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = null
  })

  it('starts with loading true and null user', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user when auth state changes to signed in', () => {
    const { result } = renderHook(() => useAuth())
    const mockUser = { uid: 'test-uid', email: 'test@example.com' }

    act(() => {
      authStateCallback(mockUser)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
  })

  it('sets user to null when auth state changes to signed out', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      authStateCallback(null)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('calls onAuthStateChanged with auth instance', () => {
    renderHook(() => useAuth())
    expect(onAuthStateChanged).toHaveBeenCalledWith({}, expect.any(Function))
  })

  it('returns unsubscribe function for cleanup on unmount', () => {
    const { unmount } = renderHook(() => useAuth())
    unmount()
    expect(mockUnsub).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  signInAnonymously: vi.fn(),
}))

vi.mock('../config', () => ({
  auth: {},
}))

import { signInWithGoogle, signOutUser, signInAnonymouslyIfNeeded } from '../auth'
import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth'
import { auth } from '../config'

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signInWithGoogle calls signInWithPopup with GoogleAuthProvider', async () => {
    const mockUser = { uid: 'abc123', displayName: 'Test User' }
    signInWithPopup.mockResolvedValue({ user: mockUser })
    const user = await signInWithGoogle()
    expect(signInWithPopup).toHaveBeenCalledWith({}, expect.any(GoogleAuthProvider))
    expect(user).toEqual(mockUser)
  })

  it('signOutUser calls signOut with auth instance', async () => {
    signOut.mockResolvedValue()
    await signOutUser()
    expect(signOut).toHaveBeenCalledWith({})
  })

  describe('signInAnonymouslyIfNeeded', () => {
    it('calls signInAnonymously when no user is currently signed in', async () => {
      auth.currentUser = null
      const mockUser = { uid: 'anon-123', isAnonymous: true }
      signInAnonymously.mockResolvedValue({ user: mockUser })

      const user = await signInAnonymouslyIfNeeded()

      expect(signInAnonymously).toHaveBeenCalledWith(auth)
      expect(user).toEqual(mockUser)
    })

    it('skips signInAnonymously when user is already signed in with Google', async () => {
      auth.currentUser = { uid: 'google-user-123', isAnonymous: false }

      const user = await signInAnonymouslyIfNeeded()

      expect(signInAnonymously).not.toHaveBeenCalled()
      expect(user).toEqual({ uid: 'google-user-123', isAnonymous: false })
    })

    it('skips signInAnonymously when user is already signed in anonymously', async () => {
      auth.currentUser = { uid: 'anon-456', isAnonymous: true }

      const user = await signInAnonymouslyIfNeeded()

      expect(signInAnonymously).not.toHaveBeenCalled()
      expect(user).toEqual({ uid: 'anon-456', isAnonymous: true })
    })

    it('throws when anonymous sign-in fails', async () => {
      auth.currentUser = null
      signInAnonymously.mockRejectedValue(new Error('Auth service unavailable'))

      await expect(signInAnonymouslyIfNeeded()).rejects.toThrow('Auth service unavailable')
    })
  })
})

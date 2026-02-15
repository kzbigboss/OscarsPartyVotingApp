import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../config', () => ({
  auth: {},
}))

import { signInWithGoogle, signOutUser } from '../auth'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

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
})

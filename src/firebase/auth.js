import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth'
import { auth } from './config'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOutUser() {
  await signOut(auth)
}

/**
 * Signs in anonymously if no user is currently authenticated.
 * Used by host delegates who authenticate via PIN but need a Firebase Auth
 * identity to satisfy Firestore security rules.
 * Skips sign-in if the user is already authenticated (Google or anonymous).
 */
export async function signInAnonymouslyIfNeeded() {
  if (auth.currentUser) {
    return auth.currentUser
  }
  const result = await signInAnonymously(auth)
  return result.user
}

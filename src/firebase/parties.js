import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

function generatePartyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Salt prevents rainbow-table attacks across parties.
// Breaking change: existing (unsalted) hashes will no longer match — acceptable pre-launch.
export async function hashPin(pin, salt = '') {
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createParty(name, hostPin, createdBy) {
  const maxAttempts = 3

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const partyCode = generatePartyCode()
    const partyRef = doc(db, 'parties', partyCode)
    const existing = await getDoc(partyRef)

    if (!existing.exists()) {
      const hostPinHash = await hashPin(hostPin, partyCode)
      await setDoc(partyRef, {
        name,
        hostPinHash,
        createdBy,
        createdAt: serverTimestamp(),
        allLocked: false,
      })
      return { partyCode }
    }
  }

  throw new Error(
    'Failed to generate a unique party code after multiple attempts. Please try again.'
  )
}

export async function getParty(partyCode) {
  const partyRef = doc(db, 'parties', partyCode)
  const snap = await getDoc(partyRef)
  if (!snap.exists()) return null
  return snap.data()
}

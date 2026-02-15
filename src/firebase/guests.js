import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

const MAX_RETRIES = 10

function generateGuestId() {
  return String(Math.floor(Math.random() * 900) + 100)
}

export async function joinParty(partyCode, displayName, isHost = false) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const guestId = generateGuestId()
    const guestRef = doc(db, 'parties', partyCode, 'guests', guestId)
    const existing = await getDoc(guestRef)
    if (!existing.exists()) {
      await setDoc(guestRef, {
        displayName,
        isHost,
        score: 0,
        joinedAt: serverTimestamp(),
      })
      return { guestId }
    }
  }
  throw new Error('Could not generate a unique guest ID. Party may be full.')
}

export async function updateGuestName(partyCode, guestId, displayName) {
  const guestRef = doc(db, 'parties', partyCode, 'guests', guestId)
  await updateDoc(guestRef, { displayName })
}

import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

function generateGuestId() {
  return String(Math.floor(Math.random() * 900) + 100)
}

export async function joinParty(partyCode, displayName) {
  const guestId = generateGuestId()
  const guestRef = doc(db, 'parties', partyCode, 'guests', guestId)
  await setDoc(guestRef, {
    displayName,
    isHost: false,
    score: 0,
    joinedAt: serverTimestamp(),
  })
  return { guestId }
}

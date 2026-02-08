import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

export async function castVote(partyCode, guestId, categoryId, nomineeId) {
  const voteId = `${guestId}_${categoryId}`
  const voteRef = doc(db, 'parties', partyCode, 'votes', voteId)
  await setDoc(voteRef, {
    guestId,
    categoryId,
    nomineeId,
    timestamp: serverTimestamp(),
  })
}

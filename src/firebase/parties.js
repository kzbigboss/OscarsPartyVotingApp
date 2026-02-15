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

export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createParty(name, hostPin) {
  const partyCode = generatePartyCode()
  const partyRef = doc(db, 'parties', partyCode)
  const hostPinHash = await hashPin(hostPin)
  await setDoc(partyRef, {
    name,
    hostPinHash,
    createdAt: serverTimestamp(),
    allLocked: false,
  })
  return { partyCode }
}

export async function getParty(partyCode) {
  const partyRef = doc(db, 'parties', partyCode)
  const snap = await getDoc(partyRef)
  if (!snap.exists()) return null
  return snap.data()
}

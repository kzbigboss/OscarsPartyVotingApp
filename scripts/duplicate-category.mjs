/**
 * One-off script: Duplicate "Best Live Action Short Film" category in party WF9ECP
 * and copy over everyone's existing votes so a second winner can be selected.
 *
 * Uses client SDK with anonymous auth (security rules require auth for category writes).
 *
 * Usage: node scripts/duplicate-category.mjs
 *
 * Reads Firebase config from .env.local (same VITE_FIREBASE_* vars the app uses).
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

// Load .env.local from project root
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const PARTY_CODE = 'WF9ECP'
const CATEGORY_NAME = 'Best Live Action Short Film'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function main() {
  // Authenticate anonymously (security rules require auth for category writes)
  await signInAnonymously(auth)
  console.log('Authenticated anonymously')

  // 1. Find the original category
  const catsRef = collection(db, 'parties', PARTY_CODE, 'categories')
  const catsSnap = await getDocs(catsRef)

  let originalId = null
  let originalData = null
  for (const d of catsSnap.docs) {
    if (d.data().name === CATEGORY_NAME) {
      originalId = d.id
      originalData = d.data()
      break
    }
  }

  if (!originalData) {
    console.error(`Category "${CATEGORY_NAME}" not found in party ${PARTY_CODE}`)
    process.exit(1)
  }

  console.log(`Found category: "${originalData.name}" (id: ${originalId})`)
  console.log(`  Nominees: ${originalData.nominees.map(n => n.name).join(', ')}`)
  console.log(`  Current winnerId: ${originalData.winnerId}`)

  // 2. Read all votes for this category
  const votesRef = collection(db, 'parties', PARTY_CODE, 'votes')
  const votesSnap = await getDocs(votesRef)
  const originalVotes = votesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(v => v.categoryId === originalId)

  console.log(`\nFound ${originalVotes.length} vote(s) for this category:`)
  for (const v of originalVotes) {
    const nominee = originalData.nominees.find(n => n.id === v.nomineeId)
    console.log(`  Guest ${v.guestId} → ${nominee?.name || v.nomineeId}`)
  }

  // 3. Create the duplicate category + copy votes in a batch
  const newCatRef = doc(catsRef) // auto-generate ID
  const newCatId = newCatRef.id

  const batch = writeBatch(db)

  batch.set(newCatRef, {
    name: `${CATEGORY_NAME} (2nd Winner)`,
    sortOrder: (originalData.sortOrder || 0) + 0.5,
    nominees: originalData.nominees,
    winnerId: null,
    locked: false,
  })

  // 4. Copy each vote to the new category
  for (const vote of originalVotes) {
    const newVoteId = `${vote.guestId}_${newCatId}`
    const newVoteRef = doc(votesRef, newVoteId)
    batch.set(newVoteRef, {
      guestId: vote.guestId,
      categoryId: newCatId,
      nomineeId: vote.nomineeId,
      timestamp: serverTimestamp(),
    })
  }

  await batch.commit()

  console.log(`\nCreated duplicate category: "${CATEGORY_NAME} (2nd Winner)" (id: ${newCatId})`)
  console.log(`Copied ${originalVotes.length} vote(s) to the new category.`)
  console.log('Guests can now change their vote and you can pick a second winner.')
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})

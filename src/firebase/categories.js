import { collection, doc, writeBatch, updateDoc } from 'firebase/firestore'
import { db } from './config'

export async function seedCategories(partyCode, categories) {
  const batch = writeBatch(db)
  for (const category of categories) {
    const catRef = doc(collection(db, 'parties', partyCode, 'categories'))
    const nominees = category.nominees.map((n, i) => ({
      id: `nom-${i}`,
      name: n.name,
      detail: n.detail || null,
    }))
    batch.set(catRef, {
      name: category.name,
      sortOrder: category.sortOrder,
      nominees,
      winnerId: null,
      locked: false,
    })
  }
  await batch.commit()
}

export async function lockCategory(partyCode, categoryId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { locked: true })
}

export async function unlockCategory(partyCode, categoryId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { locked: false })
}

export async function lockAllCategories(partyCode, categoryIds) {
  const batch = writeBatch(db)
  for (const id of categoryIds) {
    const catRef = doc(db, 'parties', partyCode, 'categories', id)
    batch.update(catRef, { locked: true })
  }
  await batch.commit()
}

export async function unlockAllCategories(partyCode, categoryIds) {
  const batch = writeBatch(db)
  for (const id of categoryIds) {
    const catRef = doc(db, 'parties', partyCode, 'categories', id)
    batch.update(catRef, { locked: false })
  }
  await batch.commit()
}

export async function selectWinner(partyCode, categoryId, nomineeId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { winnerId: nomineeId, locked: true })
}

export async function clearWinner(partyCode, categoryId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { winnerId: null, locked: false })
}

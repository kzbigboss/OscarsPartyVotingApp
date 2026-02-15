import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useCategories(partyCode) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!partyCode) return
    const q = query(
      collection(db, 'parties', partyCode, 'categories'),
      orderBy('sortOrder')
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setError(null)
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('useCategories listener error:', err)
        setError(err)
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { categories, loading, error }
}

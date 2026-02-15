import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useGuests(partyCode) {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      collection(db, 'parties', partyCode, 'guests'),
      (snap) => {
        setError(null)
        setGuests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('useGuests listener error:', err)
        setError(err)
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { guests, loading, error }
}

import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useGuests(partyCode) {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      collection(db, 'parties', partyCode, 'guests'),
      (snap) => {
        setGuests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { guests, loading }
}

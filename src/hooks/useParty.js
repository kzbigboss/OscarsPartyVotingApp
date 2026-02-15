import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useParty(partyCode) {
  const [party, setParty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      doc(db, 'parties', partyCode),
      (snap) => {
        setError(null)
        setParty(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      (err) => {
        console.error('useParty listener error:', err)
        setError(err)
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { party, loading, error }
}

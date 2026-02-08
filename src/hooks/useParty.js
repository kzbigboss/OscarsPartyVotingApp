import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useParty(partyCode) {
  const [party, setParty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(doc(db, 'parties', partyCode), (snap) => {
      setParty(snap.exists() ? snap.data() : null)
      setLoading(false)
    })
    return unsub
  }, [partyCode])

  return { party, loading }
}

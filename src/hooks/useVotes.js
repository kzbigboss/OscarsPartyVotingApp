import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useVotes(partyCode) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      collection(db, 'parties', partyCode, 'votes'),
      (snap) => {
        setError(null)
        setVotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('useVotes listener error:', err)
        setError(err)
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { votes, loading, error }
}

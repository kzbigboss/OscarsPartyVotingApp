import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useVotes(partyCode) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      collection(db, 'parties', partyCode, 'votes'),
      (snap) => {
        setVotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { votes, loading }
}

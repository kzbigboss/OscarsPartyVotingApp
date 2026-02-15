import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useMaintenance() {
  const [maintenance, setMaintenance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'maintenance'),
      (snap) => {
        if (snap.exists()) {
          setMaintenance(snap.data())
        } else {
          setMaintenance({ enabled: false })
        }
        setLoading(false)
      },
      (err) => {
        console.error('useMaintenance listener error:', err)
        setMaintenance({ enabled: false })
        setLoading(false)
      }
    )
    return unsub
  }, [])

  return { maintenance, loading }
}

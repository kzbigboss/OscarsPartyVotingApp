import { useState } from 'react'
import { useParty } from '../hooks/useParty'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import './HostModeToggle.css'

export default function HostModeToggle({ partyCode, onActivate }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const { party } = useParty(partyCode)

  async function handleSubmit(e) {
    e.preventDefault()
    if (pin === party?.hostPin) {
      const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
      const guestRef = doc(db, 'parties', partyCode, 'guests', stored.guestId)
      await updateDoc(guestRef, { isHost: true })
      stored.isHost = true
      localStorage.setItem(`guest_${partyCode}`, JSON.stringify(stored))
      onActivate()
      setShowPrompt(false)
    } else {
      setError('Incorrect PIN')
    }
  }

  if (showPrompt) {
    return (
      <div className="host-prompt">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError('') }}
            placeholder="Enter host PIN"
            autoFocus
          />
          <button type="submit">Activate</button>
          <button type="button" onClick={() => setShowPrompt(false)}>Cancel</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  return (
    <button className="host-mode-link" onClick={() => setShowPrompt(true)}>
      Host Mode
    </button>
  )
}

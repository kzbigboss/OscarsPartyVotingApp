import { useState } from 'react'
import { useParty } from '../hooks/useParty'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { hashPin } from '../firebase/parties'
import './HostModeToggle.css'

export default function HostModeToggle({ partyCode, onActivate }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const { party } = useParty(partyCode)

  async function handleSubmit(e) {
    e.preventDefault()
    const hashedInput = await hashPin(pin)
    if (hashedInput === party?.hostPinHash) {
      try {
        const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
        const guestRef = doc(db, 'parties', partyCode, 'guests', stored.guestId)
        await updateDoc(guestRef, { isHost: true })
        stored.isHost = true
        localStorage.setItem(`guest_${partyCode}`, JSON.stringify(stored))
        onActivate()
        setShowPrompt(false)
      } catch (err) {
        console.error('Failed to activate host mode:', err)
        setError('Could not activate host mode. Please try again.')
      }
    } else {
      setError('Incorrect PIN')
    }
  }

  if (showPrompt) {
    return (
      <div className="host-prompt">
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoComplete="off"
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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createParty } from '../firebase/parties'
import { seedCategories } from '../firebase/categories'
import { oscars2026Categories } from '../data/oscars2026'
import './Home.css'

export default function Home() {
  const [partyName, setPartyName] = useState('')
  const [hostPin, setHostPin] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  async function handleCreate(e) {
    e.preventDefault()
    if (!partyName.trim() || !hostPin.trim()) return
    setCreating(true)
    try {
      const { partyCode } = await createParty(partyName.trim(), hostPin.trim())
      await seedCategories(partyCode, oscars2026Categories)
      setCreatedCode(partyCode)
    } catch (err) {
      console.error('Failed to create party:', err)
    } finally {
      setCreating(false)
    }
  }

  const partyUrl = createdCode ? `${window.location.origin}/${createdCode}` : ''

  if (createdCode) {
    return (
      <div className="home">
        <h1>Party Created!</h1>
        <p className="party-name">{partyName}</p>
        <div className="qr-container">
          <QRCodeSVG value={partyUrl} size={200} />
        </div>
        <p className="party-url">{partyUrl}</p>
        <p className="party-code">Code: <strong>{createdCode}</strong></p>
        <button onClick={() => navigate(`/${createdCode}`)}>
          Join Your Party
        </button>
      </div>
    )
  }

  return (
    <div className="home">
      <h1>Oscars Party</h1>
      <p>Create a voting party for the 2026 Academy Awards.</p>
      <form onSubmit={handleCreate}>
        <label>
          Party Name
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Mark's Oscar Party 2026"
            required
          />
        </label>
        <label>
          Host PIN
          <input
            type="text"
            value={hostPin}
            onChange={(e) => setHostPin(e.target.value)}
            placeholder="A PIN to access host controls"
            required
          />
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Party'}
        </button>
      </form>
    </div>
  )
}

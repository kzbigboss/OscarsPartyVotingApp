import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthContext } from '../context/AuthContext'
import { signInWithGoogle, signOutUser } from '../firebase/auth'
import { createParty } from '../firebase/parties'
import { seedCategories } from '../firebase/categories'
import { oscars2026Categories } from '../data/oscars2026'
import './Home.css'

const ALLOWED_HOST_UID = import.meta.env.VITE_ALLOWED_HOST_UID

export default function Home() {
  const { user, loading: authLoading } = useAuthContext()
  const [partyName, setPartyName] = useState('')
  const [hostPin, setHostPin] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [creating, setCreating] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const navigate = useNavigate()

  const isAllowedHost = user?.uid === ALLOWED_HOST_UID

  async function handleSignIn() {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Sign-in failed:', err)
    } finally {
      setSigningIn(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!partyName.trim() || !hostPin.trim()) return
    setCreating(true)
    try {
      const { partyCode } = await createParty(partyName.trim(), hostPin.trim(), user.uid)
      await seedCategories(partyCode, oscars2026Categories)
      setCreatedCode(partyCode)
    } catch (err) {
      console.error('Failed to create party:', err)
    } finally {
      setCreating(false)
    }
  }

  const partyUrl = createdCode ? `${window.location.origin}/${createdCode}` : ''

  if (authLoading) {
    return <div className="home"><p>Loading...</p></div>
  }

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

  if (!user) {
    return (
      <div className="home">
        <h1>Oscars Party</h1>
        <p>Sign in to create a voting party for the 2026 Academy Awards.</p>
        <button onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    )
  }

  if (!isAllowedHost) {
    return (
      <div className="home">
        <h1>Oscars Party</h1>
        <p>You don't have permission to create parties.</p>
        <button className="sign-out-link" onClick={signOutUser}>Sign out</button>
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
            maxLength={60}
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
            maxLength={20}
            required
          />
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Party'}
        </button>
      </form>
      <button className="sign-out-link" onClick={signOutUser}>Sign out</button>
    </div>
  )
}

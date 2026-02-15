import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useParty } from '../hooks/useParty'
import { useAuthContext } from '../context/AuthContext'
import { joinParty } from '../firebase/guests'
import './Join.css'

export default function Join() {
  const { partyCode } = useParams()
  const navigate = useNavigate()
  const { party, loading } = useParty(partyCode)
  const { user } = useAuthContext()
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`guest_${partyCode}`)
    if (stored) {
      navigate(`/${partyCode}/ballot`, { replace: true })
    }
  }, [partyCode, navigate])

  async function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    try {
      const isCreator = user?.uid && user.uid === party?.createdBy
      const { guestId } = await joinParty(partyCode, name.trim(), isCreator)
      const guestData = {
        guestId,
        displayName: name.trim(),
      }
      if (isCreator) {
        guestData.isHost = true
      }
      localStorage.setItem(`guest_${partyCode}`, JSON.stringify(guestData))
      navigate(`/${partyCode}/ballot`)
    } catch (err) {
      console.error('Failed to join party:', err)
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <div className="join"><p>Loading...</p></div>
  if (!party) return <div className="join"><h1>Party not found</h1><p>Check your link and try again.</p></div>

  return (
    <div className="join">
      <h1>{party.name}</h1>
      <p>Enter your name to join the party and start voting!</p>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={30}
          required
          autoFocus
        />
        <button type="submit" disabled={joining}>
          {joining ? 'Joining...' : 'Join Party'}
        </button>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { updateGuestName } from '../firebase/guests'
import NavBar from '../components/NavBar'
import './You.css'

export default function You() {
  const { partyCode } = useParams()
  const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
  const guestId = stored.guestId
  const displayName = stored.displayName || ''

  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)

  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)

  const myVotes = {}
  for (const vote of votes) {
    if (vote.guestId === guestId) {
      myVotes[vote.categoryId] = vote.nomineeId
    }
  }

  async function handleSaveName(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === displayName) return
    setSaving(true)
    await updateGuestName(partyCode, guestId, trimmed)
    const updated = { ...stored, displayName: trimmed }
    localStorage.setItem(`guest_${partyCode}`, JSON.stringify(updated))
    setSaving(false)
  }

  if (catsLoading || votesLoading) {
    return <div className="you-page"><p>Loading...</p></div>
  }

  const votedCount = Object.keys(myVotes).length

  return (
    <div className="you-page">
      <h1>You</h1>
      <div className="you-card">
        <div className="guest-id-label">Guest #{guestId}</div>
        <form className="name-form" onSubmit={handleSaveName}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={30}
          />
          <button
            type="submit"
            className="btn-small"
            disabled={saving || !name.trim() || name.trim() === displayName}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <h2>Your Votes ({votedCount} / {categories.length})</h2>
      <div className="vote-summary">
        {categories.map((cat) => {
          const nomineeId = myVotes[cat.id]
          const nominee = nomineeId
            ? cat.nominees.find((n) => n.id === nomineeId)
            : null
          return (
            <div key={cat.id} className={`vote-row ${nomineeId ? '' : 'empty'}`}>
              <span className="vote-category">{cat.name}</span>
              <span className="vote-pick">
                {nominee ? nominee.name : '—'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}

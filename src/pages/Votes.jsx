import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { useGuests } from '../hooks/useGuests'
import { updateGuestName } from '../firebase/guests'
import NavBar from '../components/NavBar'
import './Votes.css'

export default function Votes() {
  const { partyCode } = useParams()
  const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
  const guestId = stored.guestId
  const displayName = stored.displayName || ''

  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)
  const { guests, loading: guestsLoading } = useGuests(partyCode)

  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSaveName(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === displayName) return
    setSaving(true)
    setError(null)
    try {
      await updateGuestName(partyCode, guestId, trimmed)
      const updated = { ...stored, displayName: trimmed }
      localStorage.setItem(`guest_${partyCode}`, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to update name:', err)
      setError('Could not save name. Please try again.')
    }
    setSaving(false)
  }

  if (catsLoading || votesLoading || guestsLoading) {
    return <div className="votes-page"><p>Loading...</p></div>
  }

  // Build a map of guestId -> displayName
  const guestNames = {}
  for (const guest of guests) {
    guestNames[guest.id] = guest.displayName
  }

  // Build a map of categoryId -> nomineeId -> [guestId, ...]
  const votesByCategory = {}
  for (const vote of votes) {
    if (!votesByCategory[vote.categoryId]) {
      votesByCategory[vote.categoryId] = {}
    }
    if (!votesByCategory[vote.categoryId][vote.nomineeId]) {
      votesByCategory[vote.categoryId][vote.nomineeId] = []
    }
    votesByCategory[vote.categoryId][vote.nomineeId].push(vote.guestId)
  }

  return (
    <div className="votes-page">
      <h1>Votes</h1>

      <div className="you-card">
        <div className="guest-id-label">Guest #{guestId}</div>
        <form className="name-form" onSubmit={handleSaveName}>
          <label>
            Your Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={30}
            />
          </label>
          <button
            type="submit"
            className="btn-small"
            disabled={saving || !name.trim() || name.trim() === displayName}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
        {error && (
          <div className="name-error" role="alert">{error}</div>
        )}
      </div>

      <div className="votes-categories">
        {categories.map((cat) => {
          const catVotes = votesByCategory[cat.id] || {}
          const hasVotes = Object.keys(catVotes).length > 0
          const myVoteNomineeId = votes.find(
            (v) => v.guestId === guestId && v.categoryId === cat.id
          )?.nomineeId

          return (
            <div key={cat.id} className="votes-category-card">
              <div className="votes-category-header">
                <span className="votes-category-name">{cat.name}</span>
                {cat.winnerId && (
                  <span className="votes-winner-badge">Announced</span>
                )}
              </div>

              {!hasVotes ? (
                <p className="votes-empty">No votes yet</p>
              ) : (
                <div className="votes-nominees">
                  {cat.nominees
                    .filter((nominee) => catVotes[nominee.id])
                    .map((nominee) => {
                      const voterIds = catVotes[nominee.id] || []
                      const isWinner = cat.winnerId === nominee.id
                      const isMyVote = myVoteNomineeId === nominee.id
                      const voteCount = voterIds.length

                      return (
                        <div
                          key={nominee.id}
                          className={`votes-nominee${isWinner ? ' winner' : ''}${isMyVote ? ' my-vote' : ''}`}
                        >
                          <div className="votes-nominee-header">
                            <span className="votes-nominee-name">
                              {nominee.name}
                              {isWinner && ' 🏆'}
                            </span>
                            <span className="votes-nominee-count">
                              {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                            </span>
                          </div>
                          <div className="votes-guest-list">
                            {voterIds.map((vid) => (
                              <span
                                key={vid}
                                className={`votes-guest-name${vid === guestId ? ' votes-guest-you' : ''}`}
                              >
                                {guestNames[vid] || `Guest #${vid}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}

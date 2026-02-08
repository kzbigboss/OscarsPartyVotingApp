import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { castVote } from '../firebase/votes'
import { lockCategory, unlockCategory, lockAllCategories, unlockAllCategories, selectWinner } from '../firebase/categories'
import CategoryCard from '../components/CategoryCard'
import NavBar from '../components/NavBar'
import HostModeToggle from '../components/HostModeToggle'
import './Ballot.css'

export default function Ballot() {
  const { partyCode } = useParams()
  const { categories, loading } = useCategories(partyCode)
  const { votes } = useVotes(partyCode)

  const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
  const guestId = stored.guestId
  const isHost = stored.isHost || false
  const [hostMode, setHostMode] = useState(isHost)

  const myVotes = {}
  for (const vote of votes) {
    if (vote.guestId === guestId) {
      myVotes[vote.categoryId] = vote.nomineeId
    }
  }

  function handleVote(categoryId, nomineeId) {
    castVote(partyCode, guestId, categoryId, nomineeId)
  }

  function handleLock(categoryId) {
    lockCategory(partyCode, categoryId)
  }

  function handleUnlock(categoryId) {
    unlockCategory(partyCode, categoryId)
  }

  function handleSelectWinner(categoryId, nomineeId) {
    selectWinner(partyCode, categoryId, nomineeId)
  }

  function handleLockAll() {
    lockAllCategories(partyCode, categories.map((c) => c.id))
  }

  function handleUnlockAll() {
    unlockAllCategories(partyCode, categories.map((c) => c.id))
  }

  if (loading) return <div className="ballot"><p>Loading...</p></div>

  return (
    <div className="ballot">
      <h1>Your Ballot</h1>
      {hostMode && (
        <div className="host-banner">
          <span>Host Mode</span>
          <div>
            <button className="btn-small" onClick={handleLockAll}>Lock All</button>
            <button className="btn-small" onClick={handleUnlockAll}>Unlock All</button>
          </div>
        </div>
      )}
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          myVote={myVotes[cat.id]}
          onVote={handleVote}
          isHost={hostMode}
          onLock={handleLock}
          onUnlock={handleUnlock}
          onSelectWinner={handleSelectWinner}
        />
      ))}
      {!hostMode && (
        <HostModeToggle partyCode={partyCode} onActivate={() => setHostMode(true)} />
      )}
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { castVote, clearVote } from '../firebase/votes'
import { lockCategory, unlockCategory, lockAllCategories, unlockAllCategories, selectWinner, clearWinner } from '../firebase/categories'
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
  const [expandedIds, setExpandedIds] = useState(new Set())

  const myVotes = {}
  for (const vote of votes) {
    if (vote.guestId === guestId) {
      myVotes[vote.categoryId] = vote.nomineeId
    }
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAll() {
    setExpandedIds(new Set(categories.map((c) => c.id)))
  }

  function collapseAll() {
    setExpandedIds(new Set())
  }

  function handleVote(categoryId, nomineeId) {
    castVote(partyCode, guestId, categoryId, nomineeId)
  }

  function handleClearVote(categoryId) {
    clearVote(partyCode, guestId, categoryId)
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

  function handleClearWinner(categoryId) {
    clearWinner(partyCode, categoryId)
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
      <div className="floating-menu">
        <button className="btn-small" onClick={expandAll}>Expand All</button>
        <button className="btn-small" onClick={collapseAll}>Collapse All</button>
        {hostMode && (
          <>
            <button className="btn-small" onClick={handleLockAll}>Lock All</button>
            <button className="btn-small" onClick={handleUnlockAll}>Unlock All</button>
          </>
        )}
      </div>
      <h1>Your Ballot</h1>
      {hostMode && (
        <div className="host-banner">
          <span>Host Mode</span>
        </div>
      )}
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          myVote={myVotes[cat.id]}
          onVote={handleVote}
          onClearVote={handleClearVote}
          isHost={hostMode}
          onLock={handleLock}
          onUnlock={handleUnlock}
          onSelectWinner={handleSelectWinner}
          onClearWinner={handleClearWinner}
          expanded={expandedIds.has(cat.id)}
          onToggleExpand={() => toggleExpand(cat.id)}
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

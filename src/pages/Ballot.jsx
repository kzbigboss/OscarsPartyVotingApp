import { useState, useEffect, useRef } from 'react'
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
  const [error, setError] = useState(null)
  const errorTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  function showError(message) {
    setError(message)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), 3000)
  }

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

  async function handleVote(categoryId, nomineeId) {
    try {
      await castVote(partyCode, guestId, categoryId, nomineeId)
    } catch (err) {
      console.error('Failed to cast vote:', err)
      showError('Vote failed. Please try again.')
    }
  }

  async function handleClearVote(categoryId) {
    try {
      await clearVote(partyCode, guestId, categoryId)
    } catch (err) {
      console.error('Failed to clear vote:', err)
      showError('Could not undo vote. Please try again.')
    }
  }

  async function handleLock(categoryId) {
    try {
      await lockCategory(partyCode, categoryId)
    } catch (err) {
      console.error('Failed to lock category:', err)
      showError('Could not lock category. Please try again.')
    }
  }

  async function handleUnlock(categoryId) {
    try {
      await unlockCategory(partyCode, categoryId)
    } catch (err) {
      console.error('Failed to unlock category:', err)
      showError('Could not unlock category. Please try again.')
    }
  }

  async function handleSelectWinner(categoryId, nomineeId) {
    try {
      await selectWinner(partyCode, categoryId, nomineeId)
    } catch (err) {
      console.error('Failed to select winner:', err)
      showError('Could not select winner. Please try again.')
    }
  }

  async function handleClearWinner(categoryId) {
    try {
      await clearWinner(partyCode, categoryId)
    } catch (err) {
      console.error('Failed to clear winner:', err)
      showError('Could not clear winner. Please try again.')
    }
  }

  async function handleLockAll() {
    try {
      await lockAllCategories(partyCode, categories.map((c) => c.id))
    } catch (err) {
      console.error('Failed to lock all categories:', err)
      showError('Could not lock all categories. Please try again.')
    }
  }

  async function handleUnlockAll() {
    try {
      await unlockAllCategories(partyCode, categories.map((c) => c.id))
    } catch (err) {
      console.error('Failed to unlock all categories:', err)
      showError('Could not unlock all categories. Please try again.')
    }
  }

  if (loading) return <div className="ballot"><p>Loading...</p></div>

  return (
    <div className="ballot">
      {error && (
        <div className="error-toast" role="alert">{error}</div>
      )}
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

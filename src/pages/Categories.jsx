import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import NavBar from '../components/NavBar'
import './Categories.css'

export default function Categories() {
  const { partyCode } = useParams()
  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)
  const [expandedIds, setExpandedIds] = useState(new Set())

  if (catsLoading || votesLoading) {
    return <div className="categories-page"><p>Loading...</p></div>
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

  function getVoteCounts(category) {
    const categoryVotes = votes.filter((v) => v.categoryId === category.id)
    const counts = {}
    for (const nominee of category.nominees) {
      counts[nominee.id] = categoryVotes.filter((v) => v.nomineeId === nominee.id).length
    }
    return { counts, total: categoryVotes.length }
  }

  return (
    <div className="categories-page">
      <div className="floating-menu">
        <button className="btn-small" onClick={expandAll}>Expand All</button>
        <button className="btn-small" onClick={collapseAll}>Collapse All</button>
      </div>
      <h1>Categories</h1>
      {categories.map((cat) => {
        const isExpanded = expandedIds.has(cat.id)
        const { counts, total } = isExpanded ? getVoteCounts(cat) : { counts: {}, total: 0 }
        return (
          <div key={cat.id} className="category-row" onClick={() => toggleExpand(cat.id)}>
            <div className="category-summary">
              <div className="category-summary-left">
                <span>{cat.winnerId ? '\u2713 ' : ''}{cat.name}</span>
                {!isExpanded && cat.winnerId && (() => {
                  const winner = cat.nominees.find((n) => n.id === cat.winnerId)
                  return winner ? <span className="winner-subtitle">{winner.name}</span> : null
                })()}
              </div>
              <span className="expand-icon">{isExpanded ? '\u25B2' : '\u25BC'}</span>
            </div>
            {isExpanded && (
              <div className="category-detail" onClick={(e) => e.stopPropagation()}>
                {cat.nominees.map((nom) => {
                  const count = counts[nom.id] || 0
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={nom.id} className={`nominee-row ${cat.winnerId === nom.id ? 'winner' : ''}`}>
                      <div className="nominee-info">
                        <span className="nominee-name">{nom.name}</span>
                        {nom.detail && <span className="nominee-detail">{nom.detail}</span>}
                        {cat.winnerId === nom.id && <span className="winner-label">Winner</span>}
                      </div>
                      <div className="vote-bar-container">
                        <div className="vote-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="vote-count">{count} vote{count !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}

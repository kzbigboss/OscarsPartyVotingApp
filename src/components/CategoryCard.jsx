import './CategoryCard.css'

export default function CategoryCard({ category, myVote, onVote, isHost, onLock, onUnlock, onSelectWinner, onClearWinner, expanded, onToggleExpand }) {
  const { name, nominees, locked, winnerId } = category

  return (
    <div className={`category-card ${locked ? 'locked' : ''} ${winnerId ? 'announced' : ''}`}>
      <div className="category-header" onClick={onToggleExpand}>
        <h3>{locked && '\u{1F512} '}{name}</h3>
        <div className="header-right">
          {isHost && (
            <div className="host-controls" onClick={(e) => e.stopPropagation()}>
              {winnerId && (
                <button
                  className="btn-small btn-undo"
                  onClick={() => onClearWinner(category.id)}
                >
                  Undo Winner
                </button>
              )}
              <button
                className="btn-small"
                onClick={() => locked ? onUnlock(category.id) : onLock(category.id)}
              >
                {locked ? 'Unlock' : 'Lock'}
              </button>
            </div>
          )}
          <span className="expand-icon">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </div>
      {expanded && (
        <ul className="nominee-list">
          {nominees.map((nominee) => (
            <li
              key={nominee.id}
              className={[
                'nominee',
                myVote === nominee.id ? 'selected' : '',
                winnerId === nominee.id ? 'winner' : '',
                winnerId && winnerId !== nominee.id ? 'not-winner' : '',
              ].join(' ')}
              onClick={() => !locked && onVote(category.id, nominee.id)}
            >
              <span className="nominee-name">{nominee.name}</span>
              {nominee.detail && <span className="nominee-detail">{nominee.detail}</span>}
              {myVote === nominee.id && <span className="vote-badge">Your pick</span>}
              {winnerId === nominee.id && <span className="winner-badge">Winner</span>}
              {isHost && !winnerId && (
                <button
                  className="btn-winner"
                  onClick={(e) => { e.stopPropagation(); onSelectWinner(category.id, nominee.id) }}
                >
                  Set Winner
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

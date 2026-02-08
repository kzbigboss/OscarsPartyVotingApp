import './CategoryCard.css'

export default function CategoryCard({ category, myVote, onVote, isHost, onLock, onUnlock, onSelectWinner }) {
  const { name, nominees, locked, winnerId } = category

  return (
    <div className={`category-card ${locked ? 'locked' : ''} ${winnerId ? 'announced' : ''}`}>
      <div className="category-header">
        <h3>{locked && '\u{1F512} '}{name}</h3>
        {isHost && (
          <div className="host-controls">
            <button
              className="btn-small"
              onClick={() => locked ? onUnlock(category.id) : onLock(category.id)}
            >
              {locked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        )}
      </div>
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
    </div>
  )
}

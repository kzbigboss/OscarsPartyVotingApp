import './CategoryCard.css'

export default function CategoryCard({ category, myVote, onVote, onClearVote, isHost, onLock, onUnlock, onSelectWinner, onClearWinner, expanded, onToggleExpand }) {
  const { name, nominees, locked, winnerId } = category
  const votedNominee = myVote ? nominees.find(n => n.id === myVote) : null
  const winnerNominee = winnerId ? nominees.find(n => n.id === winnerId) : null
  const isCorrect = winnerId && myVote === winnerId
  const isIncorrect = winnerId && myVote && myVote !== winnerId

  const statusIcon = winnerId
    ? (isCorrect ? '\u2713 ' : isIncorrect ? '\u2717 ' : '')
    : (myVote ? '\u2611 ' : '\u2610 ')

  const renderCollapsedSummary = () => {
    if (expanded) return null
    if (isCorrect && votedNominee) {
      return <span className="vote-summary vote-correct">{votedNominee.name}</span>
    }
    if (isIncorrect && votedNominee && winnerNominee) {
      return (
        <span className="vote-summary vote-incorrect">
          <s>{votedNominee.name}</s>
          <span className="actual-winner"> → {winnerNominee.name}</span>
        </span>
      )
    }
    if (winnerId && !myVote && winnerNominee) {
      return <span className="vote-summary vote-correct">Winner: {winnerNominee.name}</span>
    }
    if (votedNominee) {
      return <span className="vote-summary">{votedNominee.name}</span>
    }
    return null
  }

  return (
    <div className={`category-card ${locked ? 'locked' : ''} ${winnerId ? 'announced' : ''}`}>
      <div className="category-header" onClick={onToggleExpand}>
        <div className="header-left">
          <h3 className={isCorrect ? 'vote-correct' : isIncorrect ? 'vote-incorrect' : ''}>{locked && '\u{1F512} '}{statusIcon}{name}</h3>
          {renderCollapsedSummary()}
        </div>
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
              onClick={() => {
                if (locked) return
                if (myVote === nominee.id) onClearVote(category.id)
                else onVote(category.id, nominee.id)
              }}
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

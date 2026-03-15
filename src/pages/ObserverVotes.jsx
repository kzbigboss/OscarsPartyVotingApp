import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useParty } from '../hooks/useParty'
import { useGuests } from '../hooks/useGuests'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import './ObserverVotes.css'

export default function ObserverVotes() {
  const { partyCode } = useParams()
  const { party, loading: partyLoading } = useParty(partyCode)
  const { guests, loading: guestsLoading } = useGuests(partyCode)
  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)

  if (partyLoading || guestsLoading || catsLoading || votesLoading) {
    return <div className="observer-votes"><p>Loading...</p></div>
  }

  const totalAnnounced = categories.filter((c) => c.winnerId).length
  const totalCategories = categories.length

  // Build a lookup: guestId -> displayName
  const guestNames = {}
  for (const guest of guests) {
    guestNames[guest.id] = guest.displayName
  }

  // Build vote tallies per category: categoryId -> nomineeId -> { count, guestNames[] }
  const voteTallies = {}
  for (const vote of votes) {
    if (!voteTallies[vote.categoryId]) {
      voteTallies[vote.categoryId] = {}
    }
    if (!voteTallies[vote.categoryId][vote.nomineeId]) {
      voteTallies[vote.categoryId][vote.nomineeId] = { count: 0, voters: [] }
    }
    voteTallies[vote.categoryId][vote.nomineeId].count += 1
    const name = guestNames[vote.guestId] || vote.guestId
    voteTallies[vote.categoryId][vote.nomineeId].voters.push(name)
  }

  // Sort categories by sortOrder
  const sortedCategories = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

  // Scale: at scale=1 each row is ~100px. Fit all categories plus header (~200px) in viewport.
  // Use a two-column layout for portrait monitor (1440x2560), so half the rows per column.
  const rowsPerColumn = Math.ceil(sortedCategories.length / 2)
  const availableHeight = window.innerHeight - 200
  const scale = Math.min(1, availableHeight / (rowsPerColumn * 100))

  return (
    <div className="observer-votes" style={{ '--scale': scale }}>
      <div className="observer-header">
        <div className="observer-title">
          <h1>{party?.name}</h1>
          <p className="subtitle">{totalAnnounced} of {totalCategories} categories announced</p>
        </div>
        <div className="qr-section">
          <p className="qr-label">Scan to join</p>
          <QRCodeSVG
            value={`${window.location.origin}/${partyCode}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ padding: '10px', background: '#ffffff', borderRadius: '8px' }}
          />
        </div>
      </div>

      <div className="categories-grid">
        {sortedCategories.map((category) => {
          const tally = voteTallies[category.id] || {}
          const votedNominees = Object.entries(tally)
            .map(([nomineeId, data]) => {
              const nominee = category.nominees?.find((n) => n.id === nomineeId)
              return {
                id: nomineeId,
                name: nominee?.name || nomineeId,
                count: data.count,
                voters: data.voters,
                isWinner: category.winnerId === nomineeId,
              }
            })
            .sort((a, b) => b.count - a.count)

          const maxVotes = votedNominees.length > 0 ? votedNominees[0].count : 1

          return (
            <div
              key={category.id}
              className={`category-row${category.winnerId ? ' announced' : ''}`}
            >
              <h2 className="category-name">{category.name}</h2>
              <div className="nominees-list">
                {votedNominees.length === 0 ? (
                  <p className="no-votes">No votes yet</p>
                ) : (
                  votedNominees.map((nominee) => (
                    <div
                      key={nominee.id}
                      className={`nominee-bar${nominee.isWinner ? ' winner' : ''}`}
                    >
                      <div
                        className="nominee-bar-fill"
                        style={{ width: `${(nominee.count / maxVotes) * 100}%` }}
                      />
                      <div className="nominee-bar-content">
                        <span className="nominee-name">{nominee.name}</span>
                        <span className="nominee-count">{nominee.count}</span>
                      </div>
                      <div className="nominee-voters">
                        {nominee.voters.join(', ')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

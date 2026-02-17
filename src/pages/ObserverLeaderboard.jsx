import { useParams } from 'react-router-dom'
import { useParty } from '../hooks/useParty'
import { useGuests } from '../hooks/useGuests'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { calculateScores } from '../utils/scoring'
import './ObserverLeaderboard.css'

export default function ObserverLeaderboard() {
  const { partyCode } = useParams()
  const { party, loading: partyLoading } = useParty(partyCode)
  const { guests, loading: guestsLoading } = useGuests(partyCode)
  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)

  if (partyLoading || guestsLoading || catsLoading || votesLoading) {
    return <div className="observer-leaderboard"><p>Loading...</p></div>
  }

  const scores = calculateScores(categories, votes)
  const totalAnnounced = categories.filter((c) => c.winnerId).length
  const totalCategories = categories.length

  const votesCast = {}
  for (const vote of votes) {
    votesCast[vote.guestId] = (votesCast[vote.guestId] || 0) + 1
  }

  const ranked = guests
    .map((guest) => ({
      ...guest,
      correct: scores[guest.id]?.correct || 0,
      voted: votesCast[guest.id] || 0,
    }))
    .sort((a, b) => b.correct - a.correct || b.voted - a.voted)

  return (
    <div className="observer-leaderboard">
      <h1>{party?.name}</h1>
      <p className="subtitle">{totalAnnounced} of {totalCategories} categories announced</p>
      <div className="rankings-header">
        <span className="rank-col"></span>
        <span className="name-col"></span>
        <span className="voted-col">Voted</span>
        <span className="score-col">Score</span>
      </div>
      <ol className="rankings">
        {ranked.map((guest, i) => (
          <li key={guest.id} className="rank-row">
            <span className="rank">#{i + 1}</span>
            <span className="guest-name">{guest.displayName} ({guest.id})</span>
            <span className="votes-cast">{guest.voted}/{totalCategories}</span>
            <span className="score">{guest.correct}/{totalAnnounced}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

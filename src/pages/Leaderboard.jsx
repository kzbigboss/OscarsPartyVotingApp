import { useParams } from 'react-router-dom'
import { useGuests } from '../hooks/useGuests'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { calculateScores } from '../utils/scoring'
import NavBar from '../components/NavBar'
import './Leaderboard.css'

export default function Leaderboard() {
  const { partyCode } = useParams()
  const { guests, loading: guestsLoading } = useGuests(partyCode)
  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)

  if (guestsLoading || catsLoading || votesLoading) {
    return <div className="leaderboard"><p>Loading...</p></div>
  }

  const scores = calculateScores(categories, votes)
  const totalAnnounced = categories.filter((c) => c.winnerId).length

  const ranked = guests
    .map((guest) => ({
      ...guest,
      correct: scores[guest.id]?.correct || 0,
    }))
    .sort((a, b) => b.correct - a.correct)

  return (
    <div className="leaderboard">
      <h1>Leaderboard</h1>
      <p className="subtitle">{totalAnnounced} of {categories.length} categories announced</p>
      <ol className="rankings">
        {ranked.map((guest, i) => (
          <li key={guest.id} className="rank-row">
            <span className="rank">#{i + 1}</span>
            <span className="guest-name">{guest.displayName} ({guest.id})</span>
            <span className="score">{guest.correct}/{totalAnnounced}</span>
          </li>
        ))}
      </ol>
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}

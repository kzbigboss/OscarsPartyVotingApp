export function calculateScores(categories, votes) {
  const announcedCategories = categories.filter((c) => c.winnerId)
  const totalAnnounced = announcedCategories.length

  const scores = {}

  for (const vote of votes) {
    if (!scores[vote.guestId]) {
      scores[vote.guestId] = { correct: 0, total: totalAnnounced }
    }
  }

  for (const category of announcedCategories) {
    const categoryVotes = votes.filter((v) => v.categoryId === category.id)
    for (const vote of categoryVotes) {
      if (vote.nomineeId === category.winnerId) {
        scores[vote.guestId].correct++
      }
    }
  }

  return scores
}

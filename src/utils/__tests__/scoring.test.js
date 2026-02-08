import { describe, it, expect } from 'vitest'
import { calculateScores } from '../scoring'

describe('calculateScores', () => {
  it('returns 0 for all guests when no winners are announced', () => {
    const categories = [
      { id: 'cat1', winnerId: null },
    ]
    const votes = [
      { guestId: 'g1', categoryId: 'cat1', nomineeId: 'nom1' },
    ]
    const scores = calculateScores(categories, votes)
    expect(scores).toEqual({ g1: { correct: 0, total: 0 } })
  })

  it('counts correct picks when winners are announced', () => {
    const categories = [
      { id: 'cat1', winnerId: 'nom1' },
      { id: 'cat2', winnerId: 'nom3' },
    ]
    const votes = [
      { guestId: 'g1', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: 'g1', categoryId: 'cat2', nomineeId: 'nom4' },
      { guestId: 'g2', categoryId: 'cat1', nomineeId: 'nom2' },
      { guestId: 'g2', categoryId: 'cat2', nomineeId: 'nom3' },
    ]
    const scores = calculateScores(categories, votes)
    expect(scores.g1).toEqual({ correct: 1, total: 2 })
    expect(scores.g2).toEqual({ correct: 1, total: 2 })
  })

  it('total reflects only announced categories', () => {
    const categories = [
      { id: 'cat1', winnerId: 'nom1' },
      { id: 'cat2', winnerId: null },
    ]
    const votes = [
      { guestId: 'g1', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: 'g1', categoryId: 'cat2', nomineeId: 'nom3' },
    ]
    const scores = calculateScores(categories, votes)
    expect(scores.g1).toEqual({ correct: 1, total: 1 })
  })
})

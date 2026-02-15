import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CategoryCard from '../CategoryCard'

const baseCategory = {
  id: 'best-picture',
  name: 'Best Picture',
  nominees: [
    { id: 'nom1', name: 'The Brutalist' },
    { id: 'nom2', name: 'Anora' },
    { id: 'nom3', name: 'A Very Long Movie Title That Should Be Truncated' },
  ],
  locked: false,
  winnerId: null,
}

const noop = () => {}

const defaultProps = {
  category: baseCategory,
  myVote: null,
  onVote: noop,
  onClearVote: noop,
  isHost: false,
  onLock: noop,
  onUnlock: noop,
  onSelectWinner: noop,
  onClearWinner: noop,
  expanded: false,
  onToggleExpand: noop,
}

describe('CategoryCard', () => {
  it('shows voted nominee name in collapsed header when a vote exists', () => {
    render(<CategoryCard {...defaultProps} myVote="nom1" expanded={false} />)
    expect(screen.getByText('The Brutalist')).toBeInTheDocument()
    expect(screen.getByText('The Brutalist')).toHaveClass('vote-summary')
  })

  it('does not show vote summary when no vote is cast', () => {
    render(<CategoryCard {...defaultProps} myVote={null} expanded={false} />)
    expect(screen.queryByClassName?.('vote-summary')).toBeFalsy()
    const el = document.querySelector('.vote-summary')
    expect(el).toBeNull()
  })

  it('does not show vote summary when expanded even with a vote', () => {
    render(<CategoryCard {...defaultProps} myVote="nom1" expanded={true} />)
    const summaryEl = document.querySelector('.vote-summary')
    expect(summaryEl).toBeNull()
  })

  it('shows the correct nominee name when vote changes', () => {
    const { rerender } = render(
      <CategoryCard {...defaultProps} myVote="nom1" expanded={false} />
    )
    expect(screen.getByText('The Brutalist')).toBeInTheDocument()

    rerender(<CategoryCard {...defaultProps} myVote="nom2" expanded={false} />)
    expect(screen.getByText('Anora')).toBeInTheDocument()
    expect(screen.queryByText('The Brutalist')).not.toBeInTheDocument()
  })

  describe('correctness indicators (collapsed, winner announced)', () => {
    const withWinner = { ...baseCategory, winnerId: 'nom1' }

    it('shows green checkmark and nominee name when vote is correct', () => {
      render(
        <CategoryCard {...defaultProps} category={withWinner} myVote="nom1" expanded={false} />
      )
      const summary = document.querySelector('.vote-summary')
      expect(summary).not.toBeNull()
      expect(summary).toHaveClass('vote-correct')
      expect(summary.textContent).toBe('The Brutalist')
      // Header h3 should contain ✓
      const h3 = document.querySelector('h3')
      expect(h3.textContent).toContain('\u2713')
      expect(h3).toHaveClass('vote-correct')
    })

    it('shows red X with strikethrough and actual winner for incorrect vote', () => {
      render(
        <CategoryCard {...defaultProps} category={withWinner} myVote="nom2" expanded={false} />
      )
      const summary = document.querySelector('.vote-summary')
      expect(summary).not.toBeNull()
      expect(summary).toHaveClass('vote-incorrect')
      // User's pick should be in a strikethrough <s> tag
      const strikethrough = summary.querySelector('s')
      expect(strikethrough).not.toBeNull()
      expect(strikethrough.textContent).toBe('Anora')
      // Actual winner shown
      const actualWinner = summary.querySelector('.actual-winner')
      expect(actualWinner).not.toBeNull()
      expect(actualWinner.textContent).toContain('The Brutalist')
      // Header h3 should contain ✗
      const h3 = document.querySelector('h3')
      expect(h3.textContent).toContain('\u2717')
      expect(h3).toHaveClass('vote-incorrect')
    })

    it('shows winner name when no vote was cast but winner announced', () => {
      render(
        <CategoryCard {...defaultProps} category={withWinner} myVote={null} expanded={false} />
      )
      const summary = document.querySelector('.vote-summary')
      expect(summary).not.toBeNull()
      expect(summary).toHaveClass('vote-correct')
      expect(summary.textContent).toBe('Winner: The Brutalist')
      // No strikethrough
      expect(summary.querySelector('s')).toBeNull()
    })

    it('preserves current behavior when no winner announced', () => {
      render(
        <CategoryCard {...defaultProps} category={baseCategory} myVote="nom1" expanded={false} />
      )
      const summary = document.querySelector('.vote-summary')
      expect(summary).not.toBeNull()
      expect(summary).not.toHaveClass('vote-correct')
      expect(summary).not.toHaveClass('vote-incorrect')
      expect(summary.textContent).toBe('The Brutalist')
      // Header should have ☑ not ✓
      const h3 = document.querySelector('h3')
      expect(h3.textContent).toContain('\u2611')
    })
  })
})

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
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ partyCode: 'ABC123' }),
  }
})

vi.mock('../../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}))

vi.mock('../../hooks/useVotes', () => ({
  useVotes: vi.fn(),
}))

vi.mock('../../hooks/useGuests', () => ({
  useGuests: vi.fn(),
}))

vi.mock('../../firebase/guests', () => ({
  updateGuestName: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../components/NavBar', () => ({
  default: () => <nav data-testid="navbar" />,
}))

import Votes from '../Votes'
import { useCategories } from '../../hooks/useCategories'
import { useVotes } from '../../hooks/useVotes'
import { useGuests } from '../../hooks/useGuests'

const defaultCategories = [
  {
    id: 'cat1',
    name: 'Best Picture',
    sortOrder: 1,
    winnerId: 'nom1',
    nominees: [
      { id: 'nom1', name: 'The Brutalist' },
      { id: 'nom2', name: 'Conclave' },
    ],
  },
  {
    id: 'cat2',
    name: 'Best Director',
    sortOrder: 2,
    winnerId: null,
    nominees: [
      { id: 'nom3', name: 'Brady Corbet' },
      { id: 'nom4', name: 'Coralie Fargeat' },
    ],
  },
  {
    id: 'cat3',
    name: 'Best Actor',
    sortOrder: 3,
    winnerId: null,
    nominees: [
      { id: 'nom5', name: 'Adrien Brody' },
    ],
  },
]

const defaultVotes = [
  { guestId: '1000', categoryId: 'cat1', nomineeId: 'nom1' },
  { guestId: '1001', categoryId: 'cat1', nomineeId: 'nom2' },
  { guestId: '1002', categoryId: 'cat1', nomineeId: 'nom1' },
  { guestId: '1000', categoryId: 'cat2', nomineeId: 'nom3' },
  { guestId: '1001', categoryId: 'cat2', nomineeId: 'nom4' },
]

const defaultGuests = [
  { id: '1000', displayName: 'Alice' },
  { id: '1001', displayName: 'Bob' },
  { id: '1002', displayName: 'Carol' },
]

function renderVotes(guestId = '1000') {
  localStorage.setItem(
    'guest_ABC123',
    JSON.stringify({ guestId, displayName: 'Alice' })
  )
  return render(
    <MemoryRouter>
      <Votes />
    </MemoryRouter>
  )
}

describe('Votes page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useCategories.mockReturnValue({ categories: defaultCategories, loading: false })
    useVotes.mockReturnValue({ votes: defaultVotes, loading: false })
    useGuests.mockReturnValue({ guests: defaultGuests, loading: false })
  })

  it('shows loading state when categories are loading', () => {
    useCategories.mockReturnValue({ categories: [], loading: true })
    renderVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows loading state when votes are loading', () => {
    useVotes.mockReturnValue({ votes: [], loading: true })
    renderVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows loading state when guests are loading', () => {
    useGuests.mockReturnValue({ guests: [], loading: true })
    renderVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders the page heading', () => {
    renderVotes()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Votes')
  })

  it('renders the guest card with guest ID', () => {
    renderVotes()
    // Guest ID is in a nested span within the header, so check for the pattern
    expect(screen.getByText(/Guest #1000/)).toBeInTheDocument()
  })

  it('does not render the name input when collapsed by default', () => {
    renderVotes()
    const input = screen.queryByRole('textbox')
    expect(input).not.toBeInTheDocument()
  })

  it('renders the name input when expanded', () => {
    renderVotes()
    const expandButton = screen.getByRole('button', { name: /edit display name/i })
    fireEvent.click(expandButton)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('Alice')
  })

  it('renders the NavBar', () => {
    renderVotes()
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('renders each category name', () => {
    renderVotes()
    expect(screen.getByText('Best Picture')).toBeInTheDocument()
    expect(screen.getByText('Best Director')).toBeInTheDocument()
    expect(screen.getByText('Best Actor')).toBeInTheDocument()
  })

  it('groups votes by nominee within a category', () => {
    renderVotes()
    // The Brutalist has 2 votes (Alice + Carol), Conclave has 1 vote (Bob)
    // Use getAllByText since nominee name may have emoji suffix
    expect(screen.getAllByText(/The Brutalist/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Conclave/).length).toBeGreaterThan(0)
  })

  it('shows vote counts for nominees', () => {
    renderVotes()
    // 2 votes for The Brutalist and 1 for Conclave — look for the count text
    const voteCounts = screen.getAllByText(/2 vote|1 vote/i)
    expect(voteCounts.length).toBeGreaterThan(0)
  })

  it('shows guest names under each nominee', () => {
    renderVotes()
    // Guest names appear in the vote guest lists (may appear multiple times across categories)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carol').length).toBeGreaterThan(0)
  })

  it('shows no-votes state for a category with no votes', () => {
    renderVotes()
    // Best Actor has nominees but no votes cast
    expect(screen.getByText('No votes yet')).toBeInTheDocument()
  })

  it('highlights current user vote with a CSS class', () => {
    const { container } = renderVotes()
    // Alice (1000) voted for nom1 in cat1; nominee card should have my-vote class
    const myVoteElements = container.querySelectorAll('.my-vote')
    expect(myVoteElements.length).toBeGreaterThan(0)
  })

  it('marks the winner nominee for announced categories', () => {
    const { container } = renderVotes()
    // Best Picture has winnerId = nom1 (The Brutalist)
    const winnerElements = container.querySelectorAll('.winner')
    expect(winnerElements.length).toBeGreaterThan(0)
  })

  it('shows correct styling for current user vote on winner nominee', () => {
    const { container } = renderVotes()
    // Alice voted for The Brutalist which is the winner — should have both .my-vote and .winner
    const correctVote = container.querySelector('.my-vote.winner')
    expect(correctVote).not.toBeNull()
  })

  it('disables Update Name button when name has not changed', () => {
    renderVotes()
    const expandButton = screen.getByRole('button', { name: /edit display name/i })
    fireEvent.click(expandButton)
    const updateButton = screen.getByRole('button', { name: /update name/i })
    expect(updateButton).toBeDisabled()
  })

  it('enables Update Name button when name is changed', () => {
    renderVotes()
    const expandButton = screen.getByRole('button', { name: /edit display name/i })
    fireEvent.click(expandButton)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Alice Updated' } })
    const updateButton = screen.getByRole('button', { name: /update name/i })
    expect(updateButton).not.toBeDisabled()
  })

  it('uses votes-page as the top-level CSS class', () => {
    const { container } = renderVotes()
    expect(container.querySelector('.votes-page')).toBeInTheDocument()
  })

  it('renders collapsible header with Edit Display Name text', () => {
    renderVotes()
    const header = screen.getByRole('button', { name: /edit display name/i })
    expect(header).toBeInTheDocument()
  })

  it('shows guest ID in the collapsed header', () => {
    renderVotes()
    expect(screen.getByText(/Guest #1000/)).toBeInTheDocument()
  })

  it('expands the form when header is clicked', () => {
    renderVotes()
    const header = screen.getByRole('button', { name: /edit display name/i })
    fireEvent.click(header)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('collapses the form when header is clicked again', () => {
    renderVotes()
    const header = screen.getByRole('button', { name: /edit display name/i })
    // First click to expand
    fireEvent.click(header)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    // Second click to collapse
    fireEvent.click(header)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('has aria-expanded attribute reflecting expanded state', () => {
    renderVotes()
    const header = screen.getByRole('button', { name: /edit display name/i })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows chevron with rotation class when expanded', () => {
    const { container } = renderVotes()
    const header = screen.getByRole('button', { name: /edit display name/i })
    const chevron = container.querySelector('.you-card-chevron')
    expect(chevron).not.toHaveClass('expanded')
    fireEvent.click(header)
    expect(chevron).toHaveClass('expanded')
  })
})

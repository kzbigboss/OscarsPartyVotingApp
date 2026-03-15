import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ partyCode: 'ABC123' }),
  }
})

vi.mock('../../hooks/useParty', () => ({
  useParty: vi.fn(() => ({
    party: { name: 'Test Party' },
    loading: false,
  })),
}))

vi.mock('../../hooks/useGuests', () => ({
  useGuests: vi.fn(() => ({
    guests: [
      { id: '1001', displayName: 'Alice' },
      { id: '1002', displayName: 'Bob' },
      { id: '1003', displayName: 'Carol' },
    ],
    loading: false,
  })),
}))

vi.mock('../../hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: [
      {
        id: 'cat1',
        name: 'Best Picture',
        sortOrder: 1,
        winnerId: 'nom1',
        nominees: [
          { id: 'nom1', name: 'The Grand Film' },
          { id: 'nom2', name: 'Another Movie' },
          { id: 'nom3', name: 'Third Film' },
        ],
      },
      {
        id: 'cat2',
        name: 'Best Director',
        sortOrder: 2,
        winnerId: null,
        nominees: [
          { id: 'nom4', name: 'Director A' },
          { id: 'nom5', name: 'Director B' },
        ],
      },
    ],
    loading: false,
  })),
}))

vi.mock('../../hooks/useVotes', () => ({
  useVotes: vi.fn(() => ({
    votes: [
      { guestId: '1001', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: '1002', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: '1003', categoryId: 'cat1', nomineeId: 'nom2' },
      { guestId: '1001', categoryId: 'cat2', nomineeId: 'nom4' },
      { guestId: '1002', categoryId: 'cat2', nomineeId: 'nom5' },
    ],
    loading: false,
  })),
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props) => <div data-testid="qr-code" data-value={props.value} />,
}))

import ObserverVotes from '../ObserverVotes'
import { useParty } from '../../hooks/useParty'
import { useGuests } from '../../hooks/useGuests'
import { useCategories } from '../../hooks/useCategories'
import { useVotes } from '../../hooks/useVotes'

function renderObserverVotes() {
  return render(
    <MemoryRouter>
      <ObserverVotes />
    </MemoryRouter>
  )
}

describe('ObserverVotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParty.mockReturnValue({ party: { name: 'Test Party' }, loading: false })
    useGuests.mockReturnValue({
      guests: [
        { id: '1001', displayName: 'Alice' },
        { id: '1002', displayName: 'Bob' },
        { id: '1003', displayName: 'Carol' },
      ],
      loading: false,
    })
    useCategories.mockReturnValue({
      categories: [
        {
          id: 'cat1',
          name: 'Best Picture',
          sortOrder: 1,
          winnerId: 'nom1',
          nominees: [
            { id: 'nom1', name: 'The Grand Film' },
            { id: 'nom2', name: 'Another Movie' },
            { id: 'nom3', name: 'Third Film' },
          ],
        },
        {
          id: 'cat2',
          name: 'Best Director',
          sortOrder: 2,
          winnerId: null,
          nominees: [
            { id: 'nom4', name: 'Director A' },
            { id: 'nom5', name: 'Director B' },
          ],
        },
      ],
      loading: false,
    })
    useVotes.mockReturnValue({
      votes: [
        { guestId: '1001', categoryId: 'cat1', nomineeId: 'nom1' },
        { guestId: '1002', categoryId: 'cat1', nomineeId: 'nom1' },
        { guestId: '1003', categoryId: 'cat1', nomineeId: 'nom2' },
        { guestId: '1001', categoryId: 'cat2', nomineeId: 'nom4' },
        { guestId: '1002', categoryId: 'cat2', nomineeId: 'nom5' },
      ],
      loading: false,
    })
  })

  it('shows loading state when party is loading', () => {
    useParty.mockReturnValue({ party: null, loading: true })
    renderObserverVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows loading state when guests are loading', () => {
    useGuests.mockReturnValue({ guests: [], loading: true })
    renderObserverVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows loading state when categories are loading', () => {
    useCategories.mockReturnValue({ categories: [], loading: true })
    renderObserverVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows loading state when votes are loading', () => {
    useVotes.mockReturnValue({ votes: [], loading: true })
    renderObserverVotes()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays the party name as the page header', () => {
    renderObserverVotes()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Party')
  })

  it('shows subtitle with announced count', () => {
    renderObserverVotes()
    expect(screen.getByText('1 of 2 categories announced')).toBeInTheDocument()
  })

  it('renders all category names', () => {
    renderObserverVotes()
    expect(screen.getByText('Best Picture')).toBeInTheDocument()
    expect(screen.getByText('Best Director')).toBeInTheDocument()
  })

  it('renders voted nominee names within categories', () => {
    renderObserverVotes()
    // nom1 = "The Grand Film" got 2 votes, nom2 = "Another Movie" got 1 vote
    expect(screen.getByText('The Grand Film')).toBeInTheDocument()
    expect(screen.getByText('Another Movie')).toBeInTheDocument()
  })

  it('renders vote counts for nominees', () => {
    renderObserverVotes()
    // "The Grand Film" has 2 votes
    const voteCounts = screen.getAllByText('2')
    expect(voteCounts.length).toBeGreaterThan(0)
  })

  it('does not render nominees with zero votes', () => {
    renderObserverVotes()
    // nom3 = "Third Film" has no votes and should not appear
    expect(screen.queryByText('Third Film')).not.toBeInTheDocument()
  })

  it('renders guest names under the nominee bars', () => {
    renderObserverVotes()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('renders QR code pointing to /:partyCode', () => {
    renderObserverVotes()
    const qr = screen.getByTestId('qr-code')
    expect(qr).toBeInTheDocument()
    const value = qr.getAttribute('data-value')
    expect(value).toBe(`${window.location.origin}/ABC123`)
    expect(value).not.toContain('/join')
  })

  it('does not render a NavBar', () => {
    renderObserverVotes()
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('uses observer-votes as the top-level class', () => {
    const { container } = renderObserverVotes()
    expect(container.querySelector('.observer-votes')).toBeInTheDocument()
  })

  it('marks winner nominees with a winner class', () => {
    const { container } = renderObserverVotes()
    // cat1 has winnerId 'nom1' -> "The Grand Film" bar should have winner styling
    const winnerBars = container.querySelectorAll('.nominee-bar.winner')
    expect(winnerBars.length).toBeGreaterThan(0)
  })

  it('categories are sorted by sortOrder', () => {
    renderObserverVotes()
    const categoryNames = screen.getAllByRole('heading', { level: 2 })
    expect(categoryNames[0]).toHaveTextContent('Best Picture')
    expect(categoryNames[1]).toHaveTextContent('Best Director')
  })
})

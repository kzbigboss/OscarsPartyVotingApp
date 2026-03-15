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
    ],
    loading: false,
  })),
}))

vi.mock('../../hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: [
      { id: 'cat1', name: 'Best Picture', winnerId: 'nom1' },
      { id: 'cat2', name: 'Best Director', winnerId: null },
      { id: 'cat3', name: 'Best Actor', winnerId: 'nom3' },
    ],
    loading: false,
  })),
}))

vi.mock('../../hooks/useVotes', () => ({
  useVotes: vi.fn(() => ({
    votes: [
      { guestId: '1001', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: '1001', categoryId: 'cat2', nomineeId: 'nom2' },
      { guestId: '1002', categoryId: 'cat1', nomineeId: 'nom1' },
    ],
    loading: false,
  })),
}))

vi.mock('../../utils/scoring', () => ({
  calculateScores: vi.fn(() => ({
    '1001': { correct: 2 },
    '1002': { correct: 1 },
  })),
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props) => <div data-testid="qr-code" data-value={props.value} />,
}))

import ObserverLeaderboard from '../ObserverLeaderboard'
import { useParty } from '../../hooks/useParty'
import { useGuests } from '../../hooks/useGuests'
import { useCategories } from '../../hooks/useCategories'
import { useVotes } from '../../hooks/useVotes'

function renderObserver() {
  return render(
    <MemoryRouter>
      <ObserverLeaderboard />
    </MemoryRouter>
  )
}

describe('ObserverLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when hooks are loading', () => {
    useParty.mockReturnValue({ party: null, loading: true })
    renderObserver()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    useParty.mockReturnValue({ party: { name: 'Test Party' }, loading: false })
  })

  it('shows loading state when guests are loading', () => {
    useGuests.mockReturnValue({ guests: [], loading: true })
    renderObserver()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    useGuests.mockReturnValue({ guests: [{ id: '1001', displayName: 'Alice' }, { id: '1002', displayName: 'Bob' }], loading: false })
  })

  it('shows loading state when categories are loading', () => {
    useCategories.mockReturnValue({ categories: [], loading: true })
    renderObserver()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    useCategories.mockReturnValue({
      categories: [
        { id: 'cat1', name: 'Best Picture', winnerId: 'nom1' },
        { id: 'cat2', name: 'Best Director', winnerId: null },
        { id: 'cat3', name: 'Best Actor', winnerId: 'nom3' },
      ],
      loading: false,
    })
  })

  it('shows loading state when votes are loading', () => {
    useVotes.mockReturnValue({ votes: [], loading: true })
    renderObserver()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    useVotes.mockReturnValue({
      votes: [
        { guestId: '1001', categoryId: 'cat1', nomineeId: 'nom1' },
        { guestId: '1001', categoryId: 'cat2', nomineeId: 'nom2' },
        { guestId: '1002', categoryId: 'cat1', nomineeId: 'nom1' },
      ],
      loading: false,
    })
  })

  it('displays the party name as the page header', () => {
    renderObserver()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Party')
  })

  it('shows subtitle with announced count', () => {
    renderObserver()
    expect(screen.getByText('2 of 3 categories announced')).toBeInTheDocument()
  })

  it('displays guests ranked by correct score', () => {
    renderObserver()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    // Alice has 2 correct, Bob has 1 — Alice should be first
    expect(items[0]).toHaveTextContent('Alice')
    expect(items[0]).toHaveTextContent('#1')
    expect(items[1]).toHaveTextContent('Bob')
    expect(items[1]).toHaveTextContent('#2')
  })

  it('displays correct scores for each guest', () => {
    renderObserver()
    const items = screen.getAllByRole('listitem')
    // Alice: 2 correct out of 2 announced
    expect(items[0]).toHaveTextContent('2/2')
    // Bob: 1 correct out of 2 announced
    expect(items[1]).toHaveTextContent('1/2')
  })

  it('displays vote counts for each guest', () => {
    renderObserver()
    const items = screen.getAllByRole('listitem')
    // Alice voted in 2 categories out of 3 total
    expect(items[0]).toHaveTextContent('2/3')
    // Bob voted in 1 category out of 3 total
    expect(items[1]).toHaveTextContent('1/3')
  })

  it('does not render a NavBar', () => {
    renderObserver()
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
    // Also verify no nav element is present
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('does not render a nav-spacer', () => {
    const { container } = renderObserver()
    expect(container.querySelector('.nav-spacer')).not.toBeInTheDocument()
  })

  it('uses observer-leaderboard as the top-level class', () => {
    const { container } = renderObserver()
    expect(container.querySelector('.observer-leaderboard')).toBeInTheDocument()
    expect(container.querySelector('.leaderboard')).not.toBeInTheDocument()
  })

  it('renders QR code pointing to /:partyCode (not /:partyCode/join)', () => {
    renderObserver()
    const qr = screen.getByTestId('qr-code')
    expect(qr).toBeInTheDocument()
    const value = qr.getAttribute('data-value')
    expect(value).toBe(`${window.location.origin}/ABC123`)
    expect(value).not.toContain('/join')
  })
})

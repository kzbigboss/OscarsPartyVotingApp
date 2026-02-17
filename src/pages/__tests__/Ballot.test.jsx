import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ partyCode: 'ABC123' }),
  }
})

vi.mock('../../hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: [
      { id: 'cat1', name: 'Best Picture', nominees: [], sortOrder: 1 },
    ],
    loading: false,
  })),
}))

vi.mock('../../hooks/useVotes', () => ({
  useVotes: vi.fn(() => ({ votes: [] })),
}))

vi.mock('../../firebase/votes', () => ({
  castVote: vi.fn(),
  clearVote: vi.fn(),
}))

vi.mock('../../firebase/categories', () => ({
  lockCategory: vi.fn(),
  unlockCategory: vi.fn(),
  lockAllCategories: vi.fn(),
  unlockAllCategories: vi.fn(),
  selectWinner: vi.fn(),
  clearWinner: vi.fn(),
}))

vi.mock('../../utils/scoring', () => ({
  calculateScores: vi.fn(() => ({})),
}))

vi.mock('../../components/CategoryCard', () => ({
  default: () => <div data-testid="category-card" />,
}))

vi.mock('../../components/NavBar', () => ({
  default: () => <nav data-testid="navbar" />,
}))

vi.mock('../../components/HostModeToggle', () => ({
  default: () => <div data-testid="host-mode-toggle" />,
}))

vi.mock('../../components/ScoreIndicator', () => ({
  default: () => <span data-testid="score-indicator" />,
}))

import Ballot from '../Ballot'

function renderBallot() {
  return render(
    <MemoryRouter>
      <Ballot />
    </MemoryRouter>
  )
}

describe('Ballot - Copy Invite Link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('guest_ABC123', JSON.stringify({ guestId: '1000' }))

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the Copy Invite Link button in the floating menu', () => {
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })
    expect(button).toBeInTheDocument()
  })

  it('has an aria-label for accessibility', () => {
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })
    expect(button).toHaveAttribute('aria-label', 'Copy invite link to clipboard')
  })

  it('copies the correct URL to clipboard when clicked', async () => {
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })

    await act(async () => {
      fireEvent.click(button)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/ABC123`
    )
  })

  it('copied URL contains no guest-specific data', async () => {
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })

    await act(async () => {
      fireEvent.click(button)
    })

    const copiedUrl = navigator.clipboard.writeText.mock.calls[0][0]
    expect(copiedUrl).not.toContain('1000') // no guestId
    expect(copiedUrl).not.toContain('guest') // no guest param
    expect(copiedUrl).toBe(`${window.location.origin}/ABC123`)
  })

  it('shows "Copied!" feedback after clicking', async () => {
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('auto-clears "Copied!" feedback after 2 seconds', async () => {
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByText('Copied!')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
  })

  it('button is visible for all guests (not host-only)', () => {
    // Render without host mode
    localStorage.setItem('guest_ABC123', JSON.stringify({ guestId: '1000', isHost: false }))
    renderBallot()
    const button = screen.getByRole('button', { name: /copy invite link/i })
    expect(button).toBeInTheDocument()
  })
})

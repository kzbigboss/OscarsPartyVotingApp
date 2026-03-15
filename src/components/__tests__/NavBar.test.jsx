import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ partyCode: 'XYZ789' }),
  }
})

import NavBar from '../NavBar'

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  )
}

describe('NavBar', () => {
  it('renders three navigation links', () => {
    renderNavBar()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
  })

  it('renders Ballot link with correct path', () => {
    renderNavBar()
    const ballotLink = screen.getByText('Ballot')
    expect(ballotLink).toBeInTheDocument()
    expect(ballotLink.closest('a')).toHaveAttribute('href', '/XYZ789/ballot')
  })

  it('renders Leaderboard link with correct path', () => {
    renderNavBar()
    const leaderboardLink = screen.getByText('Leaderboard')
    expect(leaderboardLink).toBeInTheDocument()
    expect(leaderboardLink.closest('a')).toHaveAttribute('href', '/XYZ789/leaderboard')
  })

  it('renders Votes link with correct path', () => {
    renderNavBar()
    const votesLink = screen.getByText('Votes')
    expect(votesLink).toBeInTheDocument()
    expect(votesLink.closest('a')).toHaveAttribute('href', '/XYZ789/votes')
  })

  it('has nav-bar class on the nav element', () => {
    const { container } = renderNavBar()
    expect(container.querySelector('.nav-bar')).not.toBeNull()
  })
})

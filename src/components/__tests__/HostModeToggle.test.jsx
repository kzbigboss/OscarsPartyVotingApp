import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useParty', () => ({
  useParty: vi.fn(() => ({
    party: { hostPinHash: 'mock-hash' },
  })),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  updateDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../firebase/config', () => ({
  db: {},
}))

vi.mock('../../firebase/parties', () => ({
  hashPin: vi.fn((pin) => Promise.resolve(pin === '1234' ? 'mock-hash' : 'wrong-hash')),
}))

import HostModeToggle from '../HostModeToggle'
import { updateDoc } from 'firebase/firestore'

describe('HostModeToggle', () => {
  const mockOnActivate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('guest_ABC123', JSON.stringify({ guestId: '100' }))
  })

  it('renders Host Mode button initially', () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    expect(screen.getByText('Host Mode')).toBeInTheDocument()
  })

  it('shows PIN prompt when Host Mode button is clicked', () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    fireEvent.click(screen.getByText('Host Mode'))
    expect(screen.getByPlaceholderText('Enter host PIN')).toBeInTheDocument()
    expect(screen.getByText('Activate')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('hides PIN prompt when Cancel is clicked', () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    fireEvent.click(screen.getByText('Host Mode'))
    expect(screen.getByPlaceholderText('Enter host PIN')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByPlaceholderText('Enter host PIN')).not.toBeInTheDocument()
    expect(screen.getByText('Host Mode')).toBeInTheDocument()
  })

  it('calls onActivate and updates Firestore when correct PIN is entered', async () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    fireEvent.click(screen.getByText('Host Mode'))
    fireEvent.change(screen.getByPlaceholderText('Enter host PIN'), { target: { value: '1234' } })
    fireEvent.submit(screen.getByText('Activate').closest('form'))

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', { isHost: true })
      expect(mockOnActivate).toHaveBeenCalled()
    })
  })

  it('shows error message when incorrect PIN is entered', async () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    fireEvent.click(screen.getByText('Host Mode'))
    fireEvent.change(screen.getByPlaceholderText('Enter host PIN'), { target: { value: '9999' } })
    fireEvent.submit(screen.getByText('Activate').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Incorrect PIN')).toBeInTheDocument()
    })
    expect(mockOnActivate).not.toHaveBeenCalled()
  })

  it('clears error when user types after incorrect PIN', async () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    fireEvent.click(screen.getByText('Host Mode'))
    fireEvent.change(screen.getByPlaceholderText('Enter host PIN'), { target: { value: '9999' } })
    fireEvent.submit(screen.getByText('Activate').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Incorrect PIN')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Enter host PIN'), { target: { value: '1' } })
    expect(screen.queryByText('Incorrect PIN')).not.toBeInTheDocument()
  })

  it('has host-mode-link class on the button', () => {
    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    expect(screen.getByText('Host Mode')).toHaveClass('host-mode-link')
  })

  it('shows error message when Firestore write fails', async () => {
    updateDoc.mockRejectedValueOnce(new Error('Firestore unavailable'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<HostModeToggle partyCode="ABC123" onActivate={mockOnActivate} />)
    fireEvent.click(screen.getByText('Host Mode'))
    fireEvent.change(screen.getByPlaceholderText('Enter host PIN'), { target: { value: '1234' } })
    fireEvent.submit(screen.getByText('Activate').closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Could not activate host mode. Please try again.')).toBeInTheDocument()
    })
    expect(mockOnActivate).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('Failed to activate host mode:', expect.any(Error))

    // Verify localStorage was not updated with isHost
    const stored = JSON.parse(localStorage.getItem('guest_ABC123'))
    expect(stored.isHost).toBeUndefined()

    consoleSpy.mockRestore()
  })
})

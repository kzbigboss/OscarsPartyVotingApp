import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScoreIndicator from '../ScoreIndicator'

describe('ScoreIndicator', () => {
  it('renders correct / total format', () => {
    render(<ScoreIndicator correct={3} total={5} />)
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('renders 0 / 0 when no winners announced', () => {
    render(<ScoreIndicator correct={0} total={0} />)
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
  })

  it('renders 0 / 3 when all wrong', () => {
    render(<ScoreIndicator correct={0} total={3} />)
    expect(screen.getByText('0 / 3')).toBeInTheDocument()
  })

  it('renders perfect score', () => {
    render(<ScoreIndicator correct={24} total={24} />)
    expect(screen.getByText('24 / 24')).toBeInTheDocument()
  })

  it('has the score-indicator class', () => {
    const { container } = render(<ScoreIndicator correct={2} total={4} />)
    expect(container.querySelector('.score-indicator')).not.toBeNull()
  })
})

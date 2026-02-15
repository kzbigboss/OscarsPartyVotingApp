import './ScoreIndicator.css'

export default function ScoreIndicator({ correct, total }) {
  return (
    <span className="score-indicator">
      {correct} / {total}
    </span>
  )
}

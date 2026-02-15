import './MaintenancePage.css'

export default function MaintenancePage({ message }) {
  return (
    <div className="maintenance-page">
      <h1>We'll be back soon!</h1>
      <p>{message || 'The app is currently undergoing maintenance. Please check back shortly.'}</p>
    </div>
  )
}

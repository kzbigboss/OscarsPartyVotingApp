import { NavLink, useParams } from 'react-router-dom'
import './NavBar.css'

export default function NavBar() {
  const { partyCode } = useParams()
  return (
    <nav className="nav-bar">
      <NavLink to={`/${partyCode}/ballot`} className={({ isActive }) => isActive ? 'active' : ''}>
        Ballot
      </NavLink>
      <NavLink to={`/${partyCode}/leaderboard`} className={({ isActive }) => isActive ? 'active' : ''}>
        Leaderboard
      </NavLink>
      <NavLink to={`/${partyCode}/categories`} className={({ isActive }) => isActive ? 'active' : ''}>
        Categories
      </NavLink>
    </nav>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Join from './pages/Join'
import Ballot from './pages/Ballot'
import Leaderboard from './pages/Leaderboard'
import Categories from './pages/Categories'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:partyCode" element={<Join />} />
        <Route path="/:partyCode/ballot" element={<Ballot />} />
        <Route path="/:partyCode/leaderboard" element={<Leaderboard />} />
        <Route path="/:partyCode/categories" element={<Categories />} />
      </Routes>
    </BrowserRouter>
  )
}

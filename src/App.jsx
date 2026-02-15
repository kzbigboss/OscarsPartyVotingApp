import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

const Home = lazy(() => import('./pages/Home'))
const Join = lazy(() => import('./pages/Join'))
const Ballot = lazy(() => import('./pages/Ballot'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const You = lazy(() => import('./pages/You'))

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<div className="loading-screen">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/:partyCode" element={<Join />} />
              <Route path="/:partyCode/ballot" element={<Ballot />} />
              <Route path="/:partyCode/leaderboard" element={<Leaderboard />} />
              <Route path="/:partyCode/you" element={<You />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

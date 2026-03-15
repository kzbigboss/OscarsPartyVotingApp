import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useMaintenance } from './hooks/useMaintenance'
import MaintenancePage from './pages/MaintenancePage'
import './App.css'

const Home = lazy(() => import('./pages/Home'))
const Join = lazy(() => import('./pages/Join'))
const Ballot = lazy(() => import('./pages/Ballot'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Votes = lazy(() => import('./pages/Votes'))
const ObserverLeaderboard = lazy(() => import('./pages/ObserverLeaderboard'))

function AppContent() {
  const { maintenance, loading } = useMaintenance()

  if (loading) {
    return <div className="loading-screen">Loading…</div>
  }

  if (maintenance?.enabled && !import.meta.env.DEV) {
    return <MaintenancePage message={maintenance.message} />
  }

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
              <Route path="/:partyCode/votes" element={<Votes />} />
              <Route path="/:partyCode/observe" element={<ObserverLeaderboard />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppContent />
}

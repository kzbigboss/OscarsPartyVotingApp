# Google Auth Party Creation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gate party creation behind Google sign-in restricted to a single allowed UID, and auto-grant host mode when the party creator joins their own party.

**Architecture:** AuthContext provider at the app root runs a single `onAuthStateChanged` listener. Home.jsx checks auth state + allowed UID to show/hide the creation form. Join.jsx compares auth UID to `party.createdBy` for auto-host. All guest flows remain unauthenticated.

**Tech Stack:** Firebase Auth (Google provider via `signInWithPopup`), React Context, Vitest

---

### Task 1: Export Firebase Auth instance from config

**Files:**
- Modify: `src/firebase/config.js`

**Step 1: Add auth export**

```js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

**Step 2: Verify build still works**

Run: `npm run build`
Expected: Exit code 0, no new warnings

**Step 3: Commit**

```bash
git add src/firebase/config.js
git commit -m "feat: export Firebase Auth instance from config"
```

---

### Task 2: Auth helpers — test and implement

**Files:**
- Create: `src/firebase/__tests__/auth.test.js`
- Create: `src/firebase/auth.js`

**Step 1: Write the failing tests**

Create `src/firebase/__tests__/auth.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../config', () => ({
  auth: {},
}))

import { signInWithGoogle, signOutUser } from '../auth'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signInWithGoogle calls signInWithPopup with GoogleAuthProvider', async () => {
    const mockUser = { uid: 'abc123', displayName: 'Test User' }
    signInWithPopup.mockResolvedValue({ user: mockUser })
    const user = await signInWithGoogle()
    expect(signInWithPopup).toHaveBeenCalledWith({}, expect.any(GoogleAuthProvider))
    expect(user).toEqual(mockUser)
  })

  it('signOutUser calls signOut with auth instance', async () => {
    signOut.mockResolvedValue()
    await signOutUser()
    expect(signOut).toHaveBeenCalledWith({})
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/firebase/__tests__/auth.test.js`
Expected: FAIL — `../auth` module not found

**Step 3: Write minimal implementation**

Create `src/firebase/auth.js`:

```js
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from './config'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOutUser() {
  await signOut(auth)
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/firebase/__tests__/auth.test.js`
Expected: 2 passed

**Step 5: Commit**

```bash
git add src/firebase/__tests__/auth.test.js src/firebase/auth.js
git commit -m "feat: add Google sign-in and sign-out helpers with tests"
```

---

### Task 3: Update createParty to accept createdBy — test first

**Files:**
- Modify: `src/firebase/__tests__/parties.test.js`
- Modify: `src/firebase/parties.js`

**Step 1: Add the failing test**

Add to the `describe('parties')` block in `src/firebase/__tests__/parties.test.js`:

```js
  it('createParty stores createdBy UID in party document', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    await createParty('Test Party', '1234', 'uid-abc-123')
    const storedData = setDoc.mock.calls[0][1]
    expect(storedData).toHaveProperty('createdBy', 'uid-abc-123')
  })
```

**Step 2: Run tests to verify the new test fails**

Run: `npx vitest run src/firebase/__tests__/parties.test.js`
Expected: New test FAIL — `createdBy` not present in stored data

**Step 3: Update createParty implementation**

In `src/firebase/parties.js`, change the `createParty` function signature and `setDoc` call:

```js
export async function createParty(name, hostPin, createdBy) {
  const maxAttempts = 3
  const hostPinHash = await hashPin(hostPin)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const partyCode = generatePartyCode()
    const partyRef = doc(db, 'parties', partyCode)
    const existing = await getDoc(partyRef)

    if (!existing.exists()) {
      await setDoc(partyRef, {
        name,
        hostPinHash,
        createdBy,
        createdAt: serverTimestamp(),
        allLocked: false,
      })
      return { partyCode }
    }
  }

  throw new Error(
    'Failed to generate a unique party code after multiple attempts. Please try again.'
  )
}
```

**Step 4: Run all parties tests to verify they pass**

Run: `npx vitest run src/firebase/__tests__/parties.test.js`
Expected: All tests pass (existing tests still work because `createdBy` is `undefined` when not passed, which is fine)

**Step 5: Commit**

```bash
git add src/firebase/__tests__/parties.test.js src/firebase/parties.js
git commit -m "feat: add createdBy UID field to party document"
```

---

### Task 4: Update joinParty to accept optional isHost — test first

**Files:**
- Modify: `src/firebase/__tests__/guests.test.js`
- Modify: `src/firebase/guests.js`

**Step 1: Add failing tests**

Add to the `describe('guests')` block in `src/firebase/__tests__/guests.test.js`:

```js
  it('joinParty sets isHost to true when passed', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    await joinParty('ABC123', 'Alice', true)
    const storedData = setDoc.mock.calls[0][1]
    expect(storedData).toHaveProperty('isHost', true)
  })

  it('joinParty defaults isHost to false when not passed', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue()
    await joinParty('ABC123', 'Bob')
    const storedData = setDoc.mock.calls[0][1]
    expect(storedData).toHaveProperty('isHost', false)
  })
```

**Step 2: Run tests to verify the new isHost:true test fails**

Run: `npx vitest run src/firebase/__tests__/guests.test.js`
Expected: "joinParty sets isHost to true when passed" FAIL — `isHost` is `false`

**Step 3: Update joinParty implementation**

In `src/firebase/guests.js`, change the function signature:

```js
export async function joinParty(partyCode, displayName, isHost = false) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const guestId = generateGuestId()
    const guestRef = doc(db, 'parties', partyCode, 'guests', guestId)
    const existing = await getDoc(guestRef)
    if (!existing.exists()) {
      await setDoc(guestRef, {
        displayName,
        isHost,
        score: 0,
        joinedAt: serverTimestamp(),
      })
      return { guestId }
    }
  }
  throw new Error('Could not generate a unique guest ID. Party may be full.')
}
```

**Step 4: Run all guests tests to verify they pass**

Run: `npx vitest run src/firebase/__tests__/guests.test.js`
Expected: All 5 tests pass

**Step 5: Commit**

```bash
git add src/firebase/__tests__/guests.test.js src/firebase/guests.js
git commit -m "feat: add optional isHost parameter to joinParty"
```

---

### Task 5: Create useAuth hook and AuthContext

**Files:**
- Create: `src/hooks/useAuth.js`
- Create: `src/context/AuthContext.jsx`

**Step 1: Create the useAuth hook**

Create `src/hooks/useAuth.js`:

```js
import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, loading }
}
```

**Step 2: Create the AuthContext provider**

Create `src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Exit code 0 (new files are created but not yet imported by anything in the tree — Vite only bundles what's imported, so this should be clean)

**Step 4: Commit**

```bash
git add src/hooks/useAuth.js src/context/AuthContext.jsx
git commit -m "feat: add useAuth hook and AuthContext provider"
```

---

### Task 6: Wrap App with AuthProvider

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add AuthProvider wrapper**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Join from './pages/Join'
import Ballot from './pages/Ballot'
import Leaderboard from './pages/Leaderboard'
import Categories from './pages/Categories'
import You from './pages/You'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:partyCode" element={<Join />} />
            <Route path="/:partyCode/ballot" element={<Ballot />} />
            <Route path="/:partyCode/leaderboard" element={<Leaderboard />} />
            <Route path="/:partyCode/categories" element={<Categories />} />
            <Route path="/:partyCode/you" element={<You />} />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wrap app routes with AuthProvider"
```

---

### Task 7: Update Home.jsx with sign-in gate

**Files:**
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Home.css`

**Step 1: Update Home.jsx**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthContext } from '../context/AuthContext'
import { signInWithGoogle, signOutUser } from '../firebase/auth'
import { createParty } from '../firebase/parties'
import { seedCategories } from '../firebase/categories'
import { oscars2026Categories } from '../data/oscars2026'
import './Home.css'

const ALLOWED_HOST_UID = import.meta.env.VITE_ALLOWED_HOST_UID

export default function Home() {
  const { user, loading: authLoading } = useAuthContext()
  const [partyName, setPartyName] = useState('')
  const [hostPin, setHostPin] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [creating, setCreating] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const navigate = useNavigate()

  const isAllowedHost = user?.uid === ALLOWED_HOST_UID

  async function handleSignIn() {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Sign-in failed:', err)
    } finally {
      setSigningIn(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!partyName.trim() || !hostPin.trim()) return
    setCreating(true)
    try {
      const { partyCode } = await createParty(partyName.trim(), hostPin.trim(), user.uid)
      await seedCategories(partyCode, oscars2026Categories)
      setCreatedCode(partyCode)
    } catch (err) {
      console.error('Failed to create party:', err)
    } finally {
      setCreating(false)
    }
  }

  const partyUrl = createdCode ? `${window.location.origin}/${createdCode}` : ''

  if (authLoading) {
    return <div className="home"><p>Loading...</p></div>
  }

  if (createdCode) {
    return (
      <div className="home">
        <h1>Party Created!</h1>
        <p className="party-name">{partyName}</p>
        <div className="qr-container">
          <QRCodeSVG value={partyUrl} size={200} />
        </div>
        <p className="party-url">{partyUrl}</p>
        <p className="party-code">Code: <strong>{createdCode}</strong></p>
        <button onClick={() => navigate(`/${createdCode}`)}>
          Join Your Party
        </button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="home">
        <h1>Oscars Party</h1>
        <p>Sign in to create a voting party for the 2026 Academy Awards.</p>
        <button onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    )
  }

  if (!isAllowedHost) {
    return (
      <div className="home">
        <h1>Oscars Party</h1>
        <p>You don't have permission to create parties.</p>
        <button className="sign-out-link" onClick={signOutUser}>Sign out</button>
      </div>
    )
  }

  return (
    <div className="home">
      <h1>Oscars Party</h1>
      <p>Create a voting party for the 2026 Academy Awards.</p>
      <form onSubmit={handleCreate}>
        <label>
          Party Name
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Mark's Oscar Party 2026"
            maxLength={60}
            required
          />
        </label>
        <label>
          Host PIN
          <input
            type="text"
            value={hostPin}
            onChange={(e) => setHostPin(e.target.value)}
            placeholder="A PIN to access host controls"
            maxLength={20}
            required
          />
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Party'}
        </button>
      </form>
      <button className="sign-out-link" onClick={signOutUser}>Sign out</button>
    </div>
  )
}
```

**Step 2: Add sign-out link styling to Home.css**

Append to `src/pages/Home.css`:

```css
.sign-out-link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 14px;
  cursor: pointer;
  margin-top: var(--spacing-md);
  text-decoration: underline;
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Exit code 0

**Step 4: Commit**

```bash
git add src/pages/Home.jsx src/pages/Home.css
git commit -m "feat: gate party creation behind Google sign-in on Home page"
```

---

### Task 8: Update Join.jsx with auto-host detection

**Files:**
- Modify: `src/pages/Join.jsx`

**Step 1: Update Join.jsx**

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useParty } from '../hooks/useParty'
import { useAuthContext } from '../context/AuthContext'
import { joinParty } from '../firebase/guests'
import './Join.css'

export default function Join() {
  const { partyCode } = useParams()
  const navigate = useNavigate()
  const { party, loading } = useParty(partyCode)
  const { user } = useAuthContext()
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`guest_${partyCode}`)
    if (stored) {
      navigate(`/${partyCode}/ballot`, { replace: true })
    }
  }, [partyCode, navigate])

  async function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    try {
      const isCreator = user?.uid && user.uid === party?.createdBy
      const { guestId } = await joinParty(partyCode, name.trim(), isCreator)
      const guestData = {
        guestId,
        displayName: name.trim(),
      }
      if (isCreator) {
        guestData.isHost = true
      }
      localStorage.setItem(`guest_${partyCode}`, JSON.stringify(guestData))
      navigate(`/${partyCode}/ballot`)
    } catch (err) {
      console.error('Failed to join party:', err)
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <div className="join"><p>Loading...</p></div>
  if (!party) return <div className="join"><h1>Party not found</h1><p>Check your link and try again.</p></div>

  return (
    <div className="join">
      <h1>{party.name}</h1>
      <p>Enter your name to join the party and start voting!</p>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={30}
          required
          autoFocus
        />
        <button type="submit" disabled={joining}>
          {joining ? 'Joining...' : 'Join Party'}
        </button>
      </form>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Exit code 0

**Step 3: Commit**

```bash
git add src/pages/Join.jsx
git commit -m "feat: auto-grant host mode when party creator joins their own party"
```

---

### Task 9: Add VITE_ALLOWED_HOST_UID to environment

**Files:**
- Modify: `.env.local`

**Step 1: Add the variable**

Append to `.env.local`:

```
VITE_ALLOWED_HOST_UID=
```

Leave the value blank for now — the user will fill in their UID after first sign-in (visible in Firebase Console > Authentication > Users).

**Step 2: Commit**

`.env.local` is git-ignored so no commit needed. Note this in a console message for the user.

---

### Task 10: Run full test suite and lint

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + 4 new: 2 auth, 1 parties, 2 guests — note the existing "defaults isHost to false" test may already pass since the current code hardcodes `false`)

**Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors

**Step 3: Run build**

Run: `npm run build`
Expected: Exit code 0

**Step 4: Final commit if any fixes needed**

If lint or tests required fixes, commit those fixes here.

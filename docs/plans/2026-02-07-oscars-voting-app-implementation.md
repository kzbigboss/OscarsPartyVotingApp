# Oscars Party Voting App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time Oscars party voting web app where guests predict winners, the host logs results, and a live leaderboard tracks scores.

**Architecture:** React SPA (Vite) with Firebase Firestore for real-time data and Firebase Hosting for deployment. All logic is client-side — no server functions. Firestore security rules enforce access control. CSS variables enable future theming.

**Tech Stack:** React 18, React Router v6, Vite, Firebase (Firestore + Hosting), Vitest, qrcode.react

---

### Task 0: Local Tooling Setup with Mise

**Files:**
- Create: `.mise.toml`
- Modify: `.gitignore` (if needed)

**Goal:** Pin all runtime tools (Node.js, Firebase CLI) at the project level via Mise so anyone cloning this repo gets identical versions with `mise install`. No global installs required beyond Mise itself.

**Step 1: Create `.mise.toml` with project-level tool versions**

Create `.mise.toml`:
```toml
[tools]
node = "22.22.0"
"npm:firebase-tools" = "latest"

[env]
# Ensure node_modules/.bin is on PATH for locally installed packages
_.path = ["node_modules/.bin"]
```

**Why `.mise.toml` over `.tool-versions`?** The TOML format supports `[env]` blocks and npm packages natively, which we need for Firebase CLI and PATH configuration. `.tool-versions` only supports basic version pinning.

**Step 2: Install the pinned tools**

Run:
```bash
cd /Users/markkazzaz/Workspace/2026OscarsPartyVoting
mise install
```

Expected: Mise installs Node 22.22.0 and firebase-tools into its managed directory (not globally).

**Step 3: Verify the tools are active in this project**

Run:
```bash
mise current
node --version
firebase --version
```

Expected:
- `node` shows `22.22.0`
- `firebase` shows the installed version

**Step 4: Verify tools are project-scoped**

Run from a different directory to confirm these versions only apply inside this project:
```bash
cd /tmp && node --version && cd /Users/markkazzaz/Workspace/2026OscarsPartyVoting && node --version
```

Expected: `/tmp` uses your global Node version, the project directory uses 22.22.0.

**Step 5: Commit**

```bash
git add .mise.toml
git commit -m "chore: add mise config for project-level Node 22 and Firebase CLI"
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/App.css`
- Create: `src/theme/variables.css`

**Prerequisites:** Task 0 complete — `mise install` has been run, `node --version` shows 22.22.0.

**Step 1: Scaffold the Vite + React project**

Run (using Mise-managed Node/npm):
```bash
cd /Users/markkazzaz/Workspace/2026OscarsPartyVoting
npm create vite@latest . -- --template react
```

If prompted about non-empty directory, confirm yes (only `docs/` and `.mise.toml` exist).

**Step 2: Install dependencies**

Run:
```bash
npm install firebase react-router-dom qrcode.react
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Configure Vitest**

Add to `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

Create `src/test/setup.js`:
```js
import '@testing-library/jest-dom'
```

**Step 4: Create theme variables file**

Create `src/theme/variables.css`:
```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f5f5f5;
  --color-primary: #1a1a2e;
  --color-accent: #e2b714;
  --color-text: #1a1a1a;
  --color-text-muted: #666666;
  --color-success: #2e7d32;
  --color-error: #c62828;
  --color-locked: #9e9e9e;
  --color-border: #e0e0e0;
  --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --radius: 8px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

**Step 5: Update App.css to import theme and set base styles**

Replace `src/App.css` with:
```css
@import './theme/variables.css';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-main);
  background: var(--color-bg);
  color: var(--color-text);
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-md);
}
```

**Step 6: Verify the app runs**

Run:
```bash
npm run dev
```

Expected: Vite dev server starts, app loads in browser.

**Step 7: Verify tests run**

Run:
```bash
npx vitest run
```

Expected: Test runner works (0 tests initially is fine).

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React project with dependencies and theming"
```

---

### Task 2: Firebase Configuration

**Files:**
- Create: `src/firebase/config.js`
- Create: `.env.local` (not committed)
- Create: `.gitignore` update

**Step 1: Set up Firebase project**

Go to https://console.firebase.google.com:
1. Create a new project named "oscars-party-voting" (disable Google Analytics)
2. Add a web app, copy the config object
3. Enable Firestore Database (start in test mode for now)
4. Note: Security rules will be added in a later task

**Step 2: Create `.env.local` with Firebase config**

Create `.env.local`:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Step 3: Ensure `.env.local` is in `.gitignore`**

Vite's default `.gitignore` should already include it. Verify `.env.local` is listed.

**Step 4: Create Firebase config module**

Create `src/firebase/config.js`:
```js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

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
```

**Step 5: Commit**

```bash
git add src/firebase/config.js .gitignore
git commit -m "feat: add Firebase configuration module"
```

Do NOT commit `.env.local`.

---

### Task 3: Seed Data — 2026 Oscar Nominees

**Files:**
- Create: `src/data/oscars2026.js`

**Step 1: Create the seed data file**

Create `src/data/oscars2026.js` with all 24 categories and nominees from the 98th Academy Awards:

```js
export const oscars2026Categories = [
  {
    name: 'Best Picture',
    sortOrder: 1,
    nominees: [
      { name: 'Bugonia' },
      { name: 'F1' },
      { name: 'Frankenstein' },
      { name: 'Hamnet' },
      { name: 'Marty Supreme' },
      { name: 'One Battle After Another' },
      { name: 'The Secret Agent' },
      { name: 'Sentimental Value' },
      { name: 'Sinners' },
      { name: 'Train Dreams' },
    ],
  },
  {
    name: 'Best Director',
    sortOrder: 2,
    nominees: [
      { name: 'Paul Thomas Anderson', detail: 'One Battle After Another' },
      { name: 'Ryan Coogler', detail: 'Sinners' },
      { name: 'Chloé Zhao', detail: 'Hamnet' },
      { name: 'Josh Safdie', detail: 'Marty Supreme' },
      { name: 'Joachim Trier', detail: 'Sentimental Value' },
    ],
  },
  {
    name: 'Best Actress',
    sortOrder: 3,
    nominees: [
      { name: 'Jessie Buckley', detail: 'Hamnet' },
      { name: 'Rose Byrne', detail: 'If I Had Legs I\'d Kick You' },
      { name: 'Renate Reinsve', detail: 'Sentimental Value' },
      { name: 'Emma Stone', detail: 'Bugonia' },
      { name: 'Kate Hudson', detail: 'Song Sung Blue' },
    ],
  },
  {
    name: 'Best Actor',
    sortOrder: 4,
    nominees: [
      { name: 'Timothée Chalamet', detail: 'Marty Supreme' },
      { name: 'Leonardo DiCaprio', detail: 'One Battle After Another' },
      { name: 'Ethan Hawke', detail: 'Blue Moon' },
      { name: 'Michael B. Jordan', detail: 'Sinners' },
      { name: 'Wagner Moura', detail: 'The Secret Agent' },
    ],
  },
  {
    name: 'Best Supporting Actress',
    sortOrder: 5,
    nominees: [
      { name: 'Elle Fanning', detail: 'Sentimental Value' },
      { name: 'Inga Ibsdotter Lilieaas', detail: 'Sentimental Value' },
      { name: 'Amy Madigan', detail: 'Weapons' },
      { name: 'Wunmi Mosaku', detail: 'Sinners' },
      { name: 'Teyana Taylor', detail: 'One Battle After Another' },
    ],
  },
  {
    name: 'Best Supporting Actor',
    sortOrder: 6,
    nominees: [
      { name: 'Jacob Elordi', detail: 'Frankenstein' },
      { name: 'Sean Penn', detail: 'One Battle After Another' },
      { name: 'Stellan Skarsgård', detail: 'Sentimental Value' },
      { name: 'Benicio del Toro', detail: 'One Battle After Another' },
      { name: 'Delroy Lindo', detail: 'Sinners' },
    ],
  },
  {
    name: 'Best Original Screenplay',
    sortOrder: 7,
    nominees: [
      { name: 'Blue Moon', detail: 'Robert Kaplow' },
      { name: 'It Was Just an Accident', detail: 'Jafar Panahi' },
      { name: 'Marty Supreme', detail: 'Ronald Bronstein & Josh Safdie' },
      { name: 'Sentimental Value', detail: 'Eskil Vogt & Joachim Trier' },
      { name: 'Sinners', detail: 'Ryan Coogler' },
    ],
  },
  {
    name: 'Best Adapted Screenplay',
    sortOrder: 8,
    nominees: [
      { name: 'Bugonia', detail: 'Will Tracy' },
      { name: 'Frankenstein', detail: 'Guillermo del Toro' },
      { name: 'Hamnet', detail: 'Chloé Zhao & Maggie O\'Farrell' },
      { name: 'One Battle After Another', detail: 'Paul Thomas Anderson' },
      { name: 'Train Dreams', detail: 'Clint Bailey & Greg Kwedar' },
    ],
  },
  {
    name: 'Best Animated Feature Film',
    sortOrder: 9,
    nominees: [
      { name: 'Arco' },
      { name: 'Elio' },
      { name: 'KPop Demon Hunters' },
      { name: 'Little Amélie or the Character of Rain' },
      { name: 'Zootopia 2' },
    ],
  },
  {
    name: 'Best International Feature Film',
    sortOrder: 10,
    nominees: [
      { name: 'The Secret Agent', detail: 'Brazil' },
      { name: 'It Was Just an Accident', detail: 'France' },
      { name: 'Sentimental Value', detail: 'Norway' },
      { name: 'Sirât', detail: 'Spain' },
      { name: 'The Voice of Hind Rajab', detail: 'Tunisia' },
    ],
  },
  {
    name: 'Best Documentary Feature Film',
    sortOrder: 11,
    nominees: [
      { name: 'The Perfect Neighbor' },
      { name: 'The Alabama Solution' },
      { name: 'Come See Me in the Good Light' },
      { name: 'Cutting Through Rocks' },
      { name: 'Mr. Nobody Against Putin' },
    ],
  },
  {
    name: 'Best Cinematography',
    sortOrder: 12,
    nominees: [
      { name: 'Frankenstein' },
      { name: 'Marty Supreme' },
      { name: 'One Battle After Another' },
      { name: 'Sinners' },
      { name: 'Train Dreams' },
    ],
  },
  {
    name: 'Best Film Editing',
    sortOrder: 13,
    nominees: [
      { name: 'F1' },
      { name: 'Marty Supreme' },
      { name: 'One Battle After Another' },
      { name: 'Sentimental Value' },
      { name: 'Sinners' },
    ],
  },
  {
    name: 'Best Production Design',
    sortOrder: 14,
    nominees: [
      { name: 'Frankenstein' },
      { name: 'Hamnet' },
      { name: 'Marty Supreme' },
      { name: 'One Battle After Another' },
      { name: 'Sinners' },
    ],
  },
  {
    name: 'Best Costume Design',
    sortOrder: 15,
    nominees: [
      { name: 'Avatar: Fire and Ash' },
      { name: 'Frankenstein' },
      { name: 'Hamnet' },
      { name: 'Marty Supreme' },
      { name: 'Sinners' },
    ],
  },
  {
    name: 'Best Makeup and Hairstyling',
    sortOrder: 16,
    nominees: [
      { name: 'Frankenstein' },
      { name: 'Kokuho' },
      { name: 'Sinners' },
      { name: 'The Smashing Machine' },
      { name: 'The Ugly Stepsister' },
    ],
  },
  {
    name: 'Best Sound',
    sortOrder: 17,
    nominees: [
      { name: 'F1' },
      { name: 'Frankenstein' },
      { name: 'One Battle After Another' },
      { name: 'Sinners' },
      { name: 'Sirât' },
    ],
  },
  {
    name: 'Best Visual Effects',
    sortOrder: 18,
    nominees: [
      { name: 'Avatar: Fire and Ash' },
      { name: 'F1' },
      { name: 'Jurassic World Rebirth' },
      { name: 'The Lost Bus' },
      { name: 'Sinners' },
    ],
  },
  {
    name: 'Best Original Score',
    sortOrder: 19,
    nominees: [
      { name: 'Bugonia', detail: 'Jerskin Fendrix' },
      { name: 'Frankenstein', detail: 'Alexandre Desplat' },
      { name: 'Hamnet', detail: 'Max Richter' },
      { name: 'One Battle After Another', detail: 'Jonny Greenwood' },
      { name: 'Sinners', detail: 'Ludwig Göransson' },
    ],
  },
  {
    name: 'Best Original Song',
    sortOrder: 20,
    nominees: [
      { name: '"Golden"', detail: 'KPop Demon Hunters' },
      { name: '"Train Dreams"', detail: 'Train Dreams' },
      { name: '"Dear Me"', detail: 'Diane Warren: Relentless' },
      { name: '"I Lied To You"', detail: 'Sinners' },
      { name: '"Sweet Dreams Of Joy"', detail: 'Viva Verdi!' },
    ],
  },
  {
    name: 'Best Casting',
    sortOrder: 21,
    nominees: [
      { name: 'Hamnet' },
      { name: 'Marty Supreme' },
      { name: 'One Battle After Another' },
      { name: 'The Secret Agent' },
      { name: 'Sinners' },
    ],
  },
  {
    name: 'Best Live Action Short Film',
    sortOrder: 22,
    nominees: [
      { name: "Butcher's Stain" },
      { name: 'A Friend of Dorothy' },
      { name: "Jane Austen's Period Drama" },
      { name: 'The Singers' },
      { name: 'Two People Exchanging Saliva' },
    ],
  },
  {
    name: 'Best Animated Short Film',
    sortOrder: 23,
    nominees: [
      { name: 'Butterfly' },
      { name: 'Forevergreen' },
      { name: 'The Girl Who Cried Pearls' },
      { name: 'Retirement Plan' },
      { name: 'The Three Sisters' },
    ],
  },
  {
    name: 'Best Documentary Short Film',
    sortOrder: 24,
    nominees: [
      { name: 'All the Empty Rooms' },
      { name: 'Armed Only with a Camera' },
      { name: 'Children No More: Were and Are Gone' },
      { name: 'The Devil Is Busy' },
      { name: 'Perfectly a Strangeness' },
    ],
  },
]
```

**Step 2: Commit**

```bash
git add src/data/oscars2026.js
git commit -m "feat: add 2026 Oscar nominee seed data for all 24 categories"
```

---

### Task 4: Firestore Helper Functions — Party

**Files:**
- Create: `src/firebase/parties.js`
- Create: `src/firebase/__tests__/parties.test.js`

**Step 1: Write the test**

Create `src/firebase/__tests__/parties.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { createParty, getParty } from '../parties'
import { doc, setDoc, getDoc } from 'firebase/firestore'

describe('parties', () => {
  it('createParty generates a party code and writes to firestore', async () => {
    setDoc.mockResolvedValue()
    const result = await createParty('Test Party', '1234')
    expect(setDoc).toHaveBeenCalled()
    expect(result).toHaveProperty('partyCode')
    expect(result.partyCode).toHaveLength(6)
  })

  it('getParty fetches a party by code', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Test Party', hostPin: '1234' }),
    })
    const party = await getParty('ABC123')
    expect(getDoc).toHaveBeenCalled()
    expect(party.name).toBe('Test Party')
  })

  it('getParty returns null for non-existent party', async () => {
    getDoc.mockResolvedValue({
      exists: () => false,
    })
    const party = await getParty('NOPE00')
    expect(party).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/firebase/__tests__/parties.test.js`
Expected: FAIL — `parties.js` does not exist.

**Step 3: Implement parties.js**

Create `src/firebase/parties.js`:
```js
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

function generatePartyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createParty(name, hostPin) {
  const partyCode = generatePartyCode()
  const partyRef = doc(db, 'parties', partyCode)
  await setDoc(partyRef, {
    name,
    hostPin,
    createdAt: serverTimestamp(),
    allLocked: false,
  })
  return { partyCode }
}

export async function getParty(partyCode) {
  const partyRef = doc(db, 'parties', partyCode)
  const snap = await getDoc(partyRef)
  if (!snap.exists()) return null
  return snap.data()
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/firebase/__tests__/parties.test.js`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add src/firebase/parties.js src/firebase/__tests__/parties.test.js
git commit -m "feat: add Firestore helpers for party create/read"
```

---

### Task 5: Firestore Helper Functions — Guests

**Files:**
- Create: `src/firebase/guests.js`
- Create: `src/firebase/__tests__/guests.test.js`

**Step 1: Write the test**

Create `src/firebase/__tests__/guests.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  query: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { joinParty } from '../guests'
import { setDoc } from 'firebase/firestore'

describe('guests', () => {
  it('joinParty creates a guest document with numeric ID', async () => {
    setDoc.mockResolvedValue()
    const result = await joinParty('ABC123', 'Mike')
    expect(setDoc).toHaveBeenCalled()
    expect(result).toHaveProperty('guestId')
    expect(typeof result.guestId).toBe('string')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/firebase/__tests__/guests.test.js`
Expected: FAIL — `guests.js` does not exist.

**Step 3: Implement guests.js**

Create `src/firebase/guests.js`:
```js
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

function generateGuestId() {
  return String(Math.floor(Math.random() * 900) + 100)
}

export async function joinParty(partyCode, displayName) {
  const guestId = generateGuestId()
  const guestRef = doc(db, 'parties', partyCode, 'guests', guestId)
  await setDoc(guestRef, {
    displayName,
    isHost: false,
    score: 0,
    joinedAt: serverTimestamp(),
  })
  return { guestId }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/firebase/__tests__/guests.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/firebase/guests.js src/firebase/__tests__/guests.test.js
git commit -m "feat: add Firestore helpers for guest join"
```

---

### Task 6: Firestore Helper Functions — Categories & Votes

**Files:**
- Create: `src/firebase/categories.js`
- Create: `src/firebase/votes.js`
- Create: `src/firebase/__tests__/categories.test.js`
- Create: `src/firebase/__tests__/votes.test.js`

**Step 1: Write category tests**

Create `src/firebase/__tests__/categories.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(),
  })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { seedCategories, lockCategory, unlockCategory, selectWinner } from '../categories'
import { writeBatch, updateDoc } from 'firebase/firestore'

describe('categories', () => {
  it('seedCategories uses a batch write', async () => {
    const mockBatch = { set: vi.fn(), commit: vi.fn() }
    writeBatch.mockReturnValue(mockBatch)
    await seedCategories('ABC123', [{ name: 'Best Picture', sortOrder: 1, nominees: [] }])
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it('lockCategory sets locked to true', async () => {
    updateDoc.mockResolvedValue()
    await lockCategory('ABC123', 'cat1')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { locked: true }
    )
  })

  it('selectWinner sets winnerId and locks the category', async () => {
    updateDoc.mockResolvedValue()
    await selectWinner('ABC123', 'cat1', 'nom1')
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { winnerId: 'nom1', locked: true }
    )
  })
})
```

**Step 2: Run category tests to verify they fail**

Run: `npx vitest run src/firebase/__tests__/categories.test.js`
Expected: FAIL.

**Step 3: Implement categories.js**

Create `src/firebase/categories.js`:
```js
import { collection, doc, writeBatch, updateDoc } from 'firebase/firestore'
import { db } from './config'

export async function seedCategories(partyCode, categories) {
  const batch = writeBatch(db)
  for (const category of categories) {
    const catRef = doc(collection(db, 'parties', partyCode, 'categories'))
    const nominees = category.nominees.map((n, i) => ({
      id: `nom-${i}`,
      name: n.name,
      detail: n.detail || null,
    }))
    batch.set(catRef, {
      name: category.name,
      sortOrder: category.sortOrder,
      nominees,
      winnerId: null,
      locked: false,
    })
  }
  await batch.commit()
}

export async function lockCategory(partyCode, categoryId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { locked: true })
}

export async function unlockCategory(partyCode, categoryId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { locked: false })
}

export async function lockAllCategories(partyCode, categoryIds) {
  const batch = writeBatch(db)
  for (const id of categoryIds) {
    const catRef = doc(db, 'parties', partyCode, 'categories', id)
    batch.update(catRef, { locked: true })
  }
  await batch.commit()
}

export async function unlockAllCategories(partyCode, categoryIds) {
  const batch = writeBatch(db)
  for (const id of categoryIds) {
    const catRef = doc(db, 'parties', partyCode, 'categories', id)
    batch.update(catRef, { locked: false })
  }
  await batch.commit()
}

export async function selectWinner(partyCode, categoryId, nomineeId) {
  const catRef = doc(db, 'parties', partyCode, 'categories', categoryId)
  await updateDoc(catRef, { winnerId: nomineeId, locked: true })
}
```

**Step 4: Run category tests to verify they pass**

Run: `npx vitest run src/firebase/__tests__/categories.test.js`
Expected: PASS.

**Step 5: Write vote tests**

Create `src/firebase/__tests__/votes.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../config', () => ({
  db: {},
}))

import { castVote } from '../votes'
import { setDoc } from 'firebase/firestore'

describe('votes', () => {
  it('castVote writes a vote document keyed by guestId_categoryId', async () => {
    setDoc.mockResolvedValue()
    await castVote('ABC123', 'guest1', 'cat1', 'nom1')
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        guestId: 'guest1',
        categoryId: 'cat1',
        nomineeId: 'nom1',
      })
    )
  })
})
```

**Step 6: Run vote tests to verify they fail**

Run: `npx vitest run src/firebase/__tests__/votes.test.js`
Expected: FAIL.

**Step 7: Implement votes.js**

Create `src/firebase/votes.js`:
```js
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

export async function castVote(partyCode, guestId, categoryId, nomineeId) {
  const voteId = `${guestId}_${categoryId}`
  const voteRef = doc(db, 'parties', partyCode, 'votes', voteId)
  await setDoc(voteRef, {
    guestId,
    categoryId,
    nomineeId,
    timestamp: serverTimestamp(),
  })
}
```

**Step 8: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 9: Commit**

```bash
git add src/firebase/categories.js src/firebase/votes.js src/firebase/__tests__/categories.test.js src/firebase/__tests__/votes.test.js
git commit -m "feat: add Firestore helpers for categories, voting, and winner selection"
```

---

### Task 7: Real-Time Hooks

**Files:**
- Create: `src/hooks/useParty.js`
- Create: `src/hooks/useCategories.js`
- Create: `src/hooks/useGuests.js`
- Create: `src/hooks/useVotes.js`

**Step 1: Create useParty hook**

Create `src/hooks/useParty.js`:
```js
import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useParty(partyCode) {
  const [party, setParty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(doc(db, 'parties', partyCode), (snap) => {
      setParty(snap.exists() ? snap.data() : null)
      setLoading(false)
    })
    return unsub
  }, [partyCode])

  return { party, loading }
}
```

**Step 2: Create useCategories hook**

Create `src/hooks/useCategories.js`:
```js
import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useCategories(partyCode) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const q = query(
      collection(db, 'parties', partyCode, 'categories'),
      orderBy('sortOrder')
    )
    const unsub = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [partyCode])

  return { categories, loading }
}
```

**Step 3: Create useGuests hook**

Create `src/hooks/useGuests.js`:
```js
import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useGuests(partyCode) {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      collection(db, 'parties', partyCode, 'guests'),
      (snap) => {
        setGuests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { guests, loading }
}
```

**Step 4: Create useVotes hook**

Create `src/hooks/useVotes.js`:
```js
import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useVotes(partyCode) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyCode) return
    const unsub = onSnapshot(
      collection(db, 'parties', partyCode, 'votes'),
      (snap) => {
        setVotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }
    )
    return unsub
  }, [partyCode])

  return { votes, loading }
}
```

**Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add real-time Firestore hooks for party, categories, guests, and votes"
```

---

### Task 8: Scoring Logic

**Files:**
- Create: `src/utils/scoring.js`
- Create: `src/utils/__tests__/scoring.test.js`

**Step 1: Write the test**

Create `src/utils/__tests__/scoring.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { calculateScores } from '../scoring'

describe('calculateScores', () => {
  it('returns 0 for all guests when no winners are announced', () => {
    const categories = [
      { id: 'cat1', winnerId: null },
    ]
    const votes = [
      { guestId: 'g1', categoryId: 'cat1', nomineeId: 'nom1' },
    ]
    const scores = calculateScores(categories, votes)
    expect(scores).toEqual({ g1: { correct: 0, total: 0 } })
  })

  it('counts correct picks when winners are announced', () => {
    const categories = [
      { id: 'cat1', winnerId: 'nom1' },
      { id: 'cat2', winnerId: 'nom3' },
    ]
    const votes = [
      { guestId: 'g1', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: 'g1', categoryId: 'cat2', nomineeId: 'nom4' },
      { guestId: 'g2', categoryId: 'cat1', nomineeId: 'nom2' },
      { guestId: 'g2', categoryId: 'cat2', nomineeId: 'nom3' },
    ]
    const scores = calculateScores(categories, votes)
    expect(scores.g1).toEqual({ correct: 1, total: 2 })
    expect(scores.g2).toEqual({ correct: 1, total: 2 })
  })

  it('total reflects only announced categories', () => {
    const categories = [
      { id: 'cat1', winnerId: 'nom1' },
      { id: 'cat2', winnerId: null },
    ]
    const votes = [
      { guestId: 'g1', categoryId: 'cat1', nomineeId: 'nom1' },
      { guestId: 'g1', categoryId: 'cat2', nomineeId: 'nom3' },
    ]
    const scores = calculateScores(categories, votes)
    expect(scores.g1).toEqual({ correct: 1, total: 1 })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/scoring.test.js`
Expected: FAIL.

**Step 3: Implement scoring.js**

Create `src/utils/scoring.js`:
```js
export function calculateScores(categories, votes) {
  const announcedCategories = categories.filter((c) => c.winnerId)
  const totalAnnounced = announcedCategories.length

  const scores = {}

  for (const vote of votes) {
    if (!scores[vote.guestId]) {
      scores[vote.guestId] = { correct: 0, total: totalAnnounced }
    }
  }

  for (const category of announcedCategories) {
    const categoryVotes = votes.filter((v) => v.categoryId === category.id)
    for (const vote of categoryVotes) {
      if (vote.nomineeId === category.winnerId) {
        scores[vote.guestId].correct++
      }
    }
  }

  return scores
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/scoring.test.js`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add src/utils/scoring.js src/utils/__tests__/scoring.test.js
git commit -m "feat: add scoring logic to calculate correct picks per guest"
```

---

### Task 9: Router Setup & Page Shells

**Files:**
- Modify: `src/App.jsx`
- Create: `src/pages/Home.jsx`
- Create: `src/pages/Join.jsx`
- Create: `src/pages/Ballot.jsx`
- Create: `src/pages/Leaderboard.jsx`
- Create: `src/pages/Categories.jsx`
- Create: `src/components/NavBar.jsx`
- Create: `src/components/NavBar.css`

**Step 1: Create page shell components**

Create `src/pages/Home.jsx`:
```jsx
export default function Home() {
  return <div><h1>Oscars Party</h1><p>Create a new party to get started.</p></div>
}
```

Create `src/pages/Join.jsx`:
```jsx
import { useParams } from 'react-router-dom'

export default function Join() {
  const { partyCode } = useParams()
  return <div><h1>Join Party</h1><p>Party code: {partyCode}</p></div>
}
```

Create `src/pages/Ballot.jsx`:
```jsx
import { useParams } from 'react-router-dom'

export default function Ballot() {
  const { partyCode } = useParams()
  return <div><h1>Ballot</h1><p>Vote on categories for {partyCode}</p></div>
}
```

Create `src/pages/Leaderboard.jsx`:
```jsx
import { useParams } from 'react-router-dom'

export default function Leaderboard() {
  const { partyCode } = useParams()
  return <div><h1>Leaderboard</h1></div>
}
```

Create `src/pages/Categories.jsx`:
```jsx
import { useParams } from 'react-router-dom'

export default function Categories() {
  const { partyCode } = useParams()
  return <div><h1>Categories</h1></div>
}
```

**Step 2: Create NavBar component**

Create `src/components/NavBar.jsx`:
```jsx
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
```

Create `src/components/NavBar.css`:
```css
.nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-sm) 0;
  z-index: 100;
}

.nav-bar a {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 14px;
  padding: var(--spacing-xs) var(--spacing-md);
}

.nav-bar a.active {
  color: var(--color-primary);
  font-weight: 600;
}
```

**Step 3: Wire up App.jsx with routes**

Replace `src/App.jsx`:
```jsx
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
```

**Step 4: Verify the app runs and routes work**

Run: `npm run dev`
Navigate to `/`, `/:partyCode`, etc. — each should show its shell.

**Step 5: Commit**

```bash
git add src/App.jsx src/pages/ src/components/
git commit -m "feat: add router setup with page shells and bottom nav bar"
```

---

### Task 10: Party Creation Page (Home)

**Files:**
- Modify: `src/pages/Home.jsx`
- Create: `src/pages/Home.css`

**Step 1: Implement the Home page with party creation form**

Replace `src/pages/Home.jsx`:
```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createParty } from '../firebase/parties'
import { seedCategories } from '../firebase/categories'
import { oscars2026Categories } from '../data/oscars2026'
import './Home.css'

export default function Home() {
  const [partyName, setPartyName] = useState('')
  const [hostPin, setHostPin] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  async function handleCreate(e) {
    e.preventDefault()
    if (!partyName.trim() || !hostPin.trim()) return
    setCreating(true)
    try {
      const { partyCode } = await createParty(partyName.trim(), hostPin.trim())
      await seedCategories(partyCode, oscars2026Categories)
      setCreatedCode(partyCode)
    } catch (err) {
      console.error('Failed to create party:', err)
    } finally {
      setCreating(false)
    }
  }

  const partyUrl = createdCode ? `${window.location.origin}/${createdCode}` : ''

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
            required
          />
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Party'}
        </button>
      </form>
    </div>
  )
}
```

Create `src/pages/Home.css`:
```css
.home {
  text-align: center;
  padding: var(--spacing-xl) 0;
}

.home h1 {
  margin-bottom: var(--spacing-sm);
}

.home p {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-lg);
}

.home form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.home label {
  display: flex;
  flex-direction: column;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  gap: var(--spacing-xs);
}

.home input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 16px;
}

.home button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  cursor: pointer;
}

.home button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.qr-container {
  margin: var(--spacing-lg) auto;
}

.party-url {
  font-size: 12px;
  word-break: break-all;
}

.party-code {
  font-size: 18px;
}

.party-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}
```

**Step 2: Verify page works**

Run: `npm run dev` — visit `/`, fill in form, create party. QR code should display.

**Step 3: Commit**

```bash
git add src/pages/Home.jsx src/pages/Home.css
git commit -m "feat: implement party creation page with QR code generation"
```

---

### Task 11: Guest Join Page

**Files:**
- Modify: `src/pages/Join.jsx`
- Create: `src/pages/Join.css`

**Step 1: Implement the Join page**

Replace `src/pages/Join.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useParty } from '../hooks/useParty'
import { joinParty } from '../firebase/guests'
import './Join.css'

export default function Join() {
  const { partyCode } = useParams()
  const navigate = useNavigate()
  const { party, loading } = useParty(partyCode)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)

  // If guest already joined (stored in localStorage), redirect to ballot
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
      const { guestId } = await joinParty(partyCode, name.trim())
      localStorage.setItem(`guest_${partyCode}`, JSON.stringify({
        guestId,
        displayName: name.trim(),
      }))
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

Create `src/pages/Join.css`:
```css
.join {
  text-align: center;
  padding: var(--spacing-xl) 0;
}

.join h1 {
  margin-bottom: var(--spacing-sm);
}

.join p {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-lg);
}

.join form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.join input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 16px;
  text-align: center;
}

.join button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  cursor: pointer;
}

.join button:disabled {
  opacity: 0.6;
}
```

**Step 2: Verify the join flow works**

Run: `npm run dev` — navigate to `/:partyCode`, enter name, join. Should redirect to ballot.

**Step 3: Commit**

```bash
git add src/pages/Join.jsx src/pages/Join.css
git commit -m "feat: implement guest join page with localStorage session"
```

---

### Task 12: Ballot Page — Voting UI

**Files:**
- Modify: `src/pages/Ballot.jsx`
- Create: `src/pages/Ballot.css`
- Create: `src/components/CategoryCard.jsx`
- Create: `src/components/CategoryCard.css`

**Step 1: Create CategoryCard component**

Create `src/components/CategoryCard.jsx`:
```jsx
import './CategoryCard.css'

export default function CategoryCard({ category, myVote, onVote, isHost, onLock, onUnlock, onSelectWinner }) {
  const { name, nominees, locked, winnerId } = category

  return (
    <div className={`category-card ${locked ? 'locked' : ''} ${winnerId ? 'announced' : ''}`}>
      <div className="category-header">
        <h3>{locked && '🔒 '}{name}</h3>
        {isHost && (
          <div className="host-controls">
            <button
              className="btn-small"
              onClick={() => locked ? onUnlock(category.id) : onLock(category.id)}
            >
              {locked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        )}
      </div>
      <ul className="nominee-list">
        {nominees.map((nominee) => (
          <li
            key={nominee.id}
            className={[
              'nominee',
              myVote === nominee.id ? 'selected' : '',
              winnerId === nominee.id ? 'winner' : '',
              winnerId && winnerId !== nominee.id ? 'not-winner' : '',
            ].join(' ')}
            onClick={() => !locked && onVote(category.id, nominee.id)}
          >
            <span className="nominee-name">{nominee.name}</span>
            {nominee.detail && <span className="nominee-detail">{nominee.detail}</span>}
            {myVote === nominee.id && <span className="vote-badge">Your pick</span>}
            {winnerId === nominee.id && <span className="winner-badge">Winner</span>}
            {isHost && !winnerId && (
              <button
                className="btn-winner"
                onClick={(e) => { e.stopPropagation(); onSelectWinner(category.id, nominee.id) }}
              >
                Set Winner
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Create `src/components/CategoryCard.css`:
```css
.category-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.category-card.locked {
  opacity: 0.85;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.category-header h3 {
  font-size: 16px;
}

.nominee-list {
  list-style: none;
}

.nominee {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.category-card.locked .nominee {
  cursor: default;
}

.nominee:hover:not(.category-card.locked .nominee) {
  background: var(--color-border);
}

.nominee.selected {
  background: var(--color-primary);
  color: white;
}

.nominee.winner {
  background: var(--color-success);
  color: white;
}

.nominee.not-winner {
  opacity: 0.5;
}

.nominee-name {
  flex: 1;
}

.nominee-detail {
  font-size: 12px;
  color: var(--color-text-muted);
}

.nominee.selected .nominee-detail {
  color: rgba(255, 255, 255, 0.7);
}

.vote-badge,
.winner-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.vote-badge {
  background: rgba(255, 255, 255, 0.2);
}

.winner-badge {
  background: rgba(255, 255, 255, 0.3);
}

.btn-small {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn-winner {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
  white-space: nowrap;
}

.host-controls {
  display: flex;
  gap: var(--spacing-xs);
}
```

**Step 2: Implement Ballot page**

Replace `src/pages/Ballot.jsx`:
```jsx
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { castVote } from '../firebase/votes'
import { lockCategory, unlockCategory, lockAllCategories, unlockAllCategories, selectWinner } from '../firebase/categories'
import CategoryCard from '../components/CategoryCard'
import NavBar from '../components/NavBar'
import './Ballot.css'

export default function Ballot() {
  const { partyCode } = useParams()
  const { categories, loading } = useCategories(partyCode)
  const { votes } = useVotes(partyCode)

  const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
  const guestId = stored.guestId
  const isHost = stored.isHost || false

  const myVotes = {}
  for (const vote of votes) {
    if (vote.guestId === guestId) {
      myVotes[vote.categoryId] = vote.nomineeId
    }
  }

  function handleVote(categoryId, nomineeId) {
    castVote(partyCode, guestId, categoryId, nomineeId)
  }

  function handleLock(categoryId) {
    lockCategory(partyCode, categoryId)
  }

  function handleUnlock(categoryId) {
    unlockCategory(partyCode, categoryId)
  }

  function handleSelectWinner(categoryId, nomineeId) {
    selectWinner(partyCode, categoryId, nomineeId)
  }

  function handleLockAll() {
    lockAllCategories(partyCode, categories.map((c) => c.id))
  }

  function handleUnlockAll() {
    unlockAllCategories(partyCode, categories.map((c) => c.id))
  }

  if (loading) return <div className="ballot"><p>Loading...</p></div>

  return (
    <div className="ballot">
      <h1>Your Ballot</h1>
      {isHost && (
        <div className="host-banner">
          <span>Host Mode</span>
          <div>
            <button className="btn-small" onClick={handleLockAll}>Lock All</button>
            <button className="btn-small" onClick={handleUnlockAll}>Unlock All</button>
          </div>
        </div>
      )}
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          myVote={myVotes[cat.id]}
          onVote={handleVote}
          isHost={isHost}
          onLock={handleLock}
          onUnlock={handleUnlock}
          onSelectWinner={handleSelectWinner}
        />
      ))}
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}
```

Create `src/pages/Ballot.css`:
```css
.ballot {
  padding-bottom: 80px;
}

.ballot h1 {
  margin-bottom: var(--spacing-md);
}

.host-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-accent);
  color: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius);
  margin-bottom: var(--spacing-md);
  font-weight: 600;
  font-size: 14px;
}

.host-banner div {
  display: flex;
  gap: var(--spacing-xs);
}

.nav-spacer {
  height: 60px;
}
```

**Step 3: Verify ballot works**

Run: `npm run dev` — join a party, see categories, tap to vote.

**Step 4: Commit**

```bash
git add src/pages/Ballot.jsx src/pages/Ballot.css src/components/CategoryCard.jsx src/components/CategoryCard.css
git commit -m "feat: implement ballot page with voting, locking, and host controls"
```

---

### Task 13: Host Mode Toggle

**Files:**
- Create: `src/components/HostModeToggle.jsx`
- Create: `src/components/HostModeToggle.css`
- Modify: `src/pages/Ballot.jsx` (add toggle)

**Step 1: Create HostModeToggle component**

Create `src/components/HostModeToggle.jsx`:
```jsx
import { useState } from 'react'
import { useParty } from '../hooks/useParty'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import './HostModeToggle.css'

export default function HostModeToggle({ partyCode, onActivate }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const { party } = useParty(partyCode)

  async function handleSubmit(e) {
    e.preventDefault()
    if (pin === party?.hostPin) {
      // Update guest record in Firestore
      const stored = JSON.parse(localStorage.getItem(`guest_${partyCode}`) || '{}')
      const guestRef = doc(db, 'parties', partyCode, 'guests', stored.guestId)
      await updateDoc(guestRef, { isHost: true })
      // Update localStorage
      stored.isHost = true
      localStorage.setItem(`guest_${partyCode}`, JSON.stringify(stored))
      onActivate()
      setShowPrompt(false)
    } else {
      setError('Incorrect PIN')
    }
  }

  if (showPrompt) {
    return (
      <div className="host-prompt">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError('') }}
            placeholder="Enter host PIN"
            autoFocus
          />
          <button type="submit">Activate</button>
          <button type="button" onClick={() => setShowPrompt(false)}>Cancel</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  return (
    <button className="host-mode-link" onClick={() => setShowPrompt(true)}>
      Host Mode
    </button>
  )
}
```

Create `src/components/HostModeToggle.css`:
```css
.host-mode-link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: var(--spacing-sm);
}

.host-prompt {
  background: var(--color-surface);
  padding: var(--spacing-md);
  border-radius: var(--radius);
  margin-bottom: var(--spacing-md);
}

.host-prompt form {
  display: flex;
  gap: var(--spacing-sm);
}

.host-prompt input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
}

.host-prompt button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.host-prompt .error {
  color: var(--color-error);
  font-size: 12px;
  margin-top: var(--spacing-xs);
}
```

**Step 2: Add HostModeToggle to Ballot page**

Modify `src/pages/Ballot.jsx` — add the toggle in the footer area (before NavBar) when not in host mode:

Add import at top:
```jsx
import HostModeToggle from '../components/HostModeToggle'
```

Add state for host mode:
```jsx
const [hostMode, setHostMode] = useState(isHost)
```

Replace `isHost` references with `hostMode`, and add before `<NavBar />`:
```jsx
{!hostMode && (
  <HostModeToggle partyCode={partyCode} onActivate={() => setHostMode(true)} />
)}
```

**Step 3: Verify host mode toggle works**

Run: `npm run dev` — join party, click "Host Mode", enter PIN, see controls appear.

**Step 4: Commit**

```bash
git add src/components/HostModeToggle.jsx src/components/HostModeToggle.css src/pages/Ballot.jsx
git commit -m "feat: add host mode toggle with PIN authentication"
```

---

### Task 14: Leaderboard Page

**Files:**
- Modify: `src/pages/Leaderboard.jsx`
- Create: `src/pages/Leaderboard.css`

**Step 1: Implement the Leaderboard page**

Replace `src/pages/Leaderboard.jsx`:
```jsx
import { useParams } from 'react-router-dom'
import { useGuests } from '../hooks/useGuests'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import { calculateScores } from '../utils/scoring'
import NavBar from '../components/NavBar'
import './Leaderboard.css'

export default function Leaderboard() {
  const { partyCode } = useParams()
  const { guests, loading: guestsLoading } = useGuests(partyCode)
  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)

  if (guestsLoading || catsLoading || votesLoading) {
    return <div className="leaderboard"><p>Loading...</p></div>
  }

  const scores = calculateScores(categories, votes)
  const totalAnnounced = categories.filter((c) => c.winnerId).length

  const ranked = guests
    .map((guest) => ({
      ...guest,
      correct: scores[guest.id]?.correct || 0,
    }))
    .sort((a, b) => b.correct - a.correct)

  return (
    <div className="leaderboard">
      <h1>Leaderboard</h1>
      <p className="subtitle">{totalAnnounced} of {categories.length} categories announced</p>
      <ol className="rankings">
        {ranked.map((guest, i) => (
          <li key={guest.id} className="rank-row">
            <span className="rank">#{i + 1}</span>
            <span className="guest-name">{guest.displayName} ({guest.id})</span>
            <span className="score">{guest.correct}/{totalAnnounced}</span>
          </li>
        ))}
      </ol>
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}
```

Create `src/pages/Leaderboard.css`:
```css
.leaderboard {
  padding-bottom: 80px;
}

.leaderboard h1 {
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 14px;
  margin-bottom: var(--spacing-lg);
}

.rankings {
  list-style: none;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius);
  margin-bottom: var(--spacing-xs);
}

.rank {
  font-weight: 700;
  width: 40px;
  color: var(--color-text-muted);
}

.guest-name {
  flex: 1;
}

.score {
  font-weight: 700;
  font-size: 18px;
}

.nav-spacer {
  height: 60px;
}
```

**Step 2: Verify leaderboard works**

Run: `npm run dev` — navigate to leaderboard, see ranked list updating.

**Step 3: Commit**

```bash
git add src/pages/Leaderboard.jsx src/pages/Leaderboard.css
git commit -m "feat: implement live leaderboard with real-time scoring"
```

---

### Task 15: Category Breakdown Page

**Files:**
- Modify: `src/pages/Categories.jsx`
- Create: `src/pages/Categories.css`

**Step 1: Implement the Categories page**

Replace `src/pages/Categories.jsx`:
```jsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useVotes } from '../hooks/useVotes'
import NavBar from '../components/NavBar'
import './Categories.css'

export default function Categories() {
  const { partyCode } = useParams()
  const { categories, loading: catsLoading } = useCategories(partyCode)
  const { votes, loading: votesLoading } = useVotes(partyCode)
  const [expanded, setExpanded] = useState(null)

  if (catsLoading || votesLoading) {
    return <div className="categories-page"><p>Loading...</p></div>
  }

  function getVoteCounts(category) {
    const categoryVotes = votes.filter((v) => v.categoryId === category.id)
    const counts = {}
    for (const nominee of category.nominees) {
      counts[nominee.id] = categoryVotes.filter((v) => v.nomineeId === nominee.id).length
    }
    return { counts, total: categoryVotes.length }
  }

  return (
    <div className="categories-page">
      <h1>Categories</h1>
      {categories.map((cat) => {
        const isExpanded = expanded === cat.id
        const { counts, total } = isExpanded ? getVoteCounts(cat) : { counts: {}, total: 0 }
        return (
          <div key={cat.id} className="category-row" onClick={() => setExpanded(isExpanded ? null : cat.id)}>
            <div className="category-summary">
              <span>{cat.winnerId ? '✓ ' : ''}{cat.name}</span>
              <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
            </div>
            {isExpanded && (
              <div className="category-detail">
                {cat.nominees.map((nom) => {
                  const count = counts[nom.id] || 0
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={nom.id} className={`nominee-row ${cat.winnerId === nom.id ? 'winner' : ''}`}>
                      <div className="nominee-info">
                        <span className="nominee-name">{nom.name}</span>
                        {nom.detail && <span className="nominee-detail">{nom.detail}</span>}
                        {cat.winnerId === nom.id && <span className="winner-label">Winner</span>}
                      </div>
                      <div className="vote-bar-container">
                        <div className="vote-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="vote-count">{count} vote{count !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <div className="nav-spacer" />
      <NavBar />
    </div>
  )
}
```

Create `src/pages/Categories.css`:
```css
.categories-page {
  padding-bottom: 80px;
}

.categories-page h1 {
  margin-bottom: var(--spacing-md);
}

.category-row {
  background: var(--color-surface);
  border-radius: var(--radius);
  margin-bottom: var(--spacing-sm);
  cursor: pointer;
  overflow: hidden;
}

.category-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  font-weight: 600;
}

.expand-icon {
  font-size: 12px;
  color: var(--color-text-muted);
}

.category-detail {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.nominee-row {
  padding: var(--spacing-sm) 0;
}

.nominee-row.winner {
  font-weight: 600;
}

.nominee-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.nominee-info .nominee-name {
  font-size: 14px;
}

.nominee-info .nominee-detail {
  font-size: 12px;
  color: var(--color-text-muted);
}

.winner-label {
  font-size: 11px;
  background: var(--color-success);
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
}

.vote-bar-container {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 2px;
}

.vote-bar {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s;
}

.nominee-row.winner .vote-bar {
  background: var(--color-success);
}

.vote-count {
  font-size: 12px;
  color: var(--color-text-muted);
}

.nav-spacer {
  height: 60px;
}
```

**Step 2: Verify categories page works**

Run: `npm run dev` — navigate to categories, expand to see vote distribution.

**Step 3: Commit**

```bash
git add src/pages/Categories.jsx src/pages/Categories.css
git commit -m "feat: implement category breakdown page with vote distribution bars"
```

---

### Task 16: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

**Step 1: Write security rules**

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /parties/{partyCode} {
      // Anyone can read a party (need the code in the URL to access)
      allow read: if true;
      // Anyone can create a party
      allow create: if true;
      // Only host can update party settings
      allow update: if isHost(partyCode, request.auth);

      match /categories/{categoryId} {
        allow read: if true;
        allow write: if isHost(partyCode, request.auth);
      }

      match /guests/{guestId} {
        allow read: if true;
        allow create: if true;
        allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isHost']);
      }

      match /votes/{voteId} {
        allow read: if true;
        // Allow write only if the category is not locked
        allow create, update: if true;
      }
    }

    function isHost(partyCode, auth) {
      return true; // Simplified for trusted party setting - no Firebase Auth
    }
  }
}
```

Note: Since we're not using Firebase Auth, these rules are permissive for the trusted party setting. The client-side code enforces the host PIN check. For a production app, you'd use Firebase Auth and tighter rules.

**Step 2: Deploy rules to Firebase**

Run:
```bash
firebase deploy --only firestore:rules
```

Or deploy via the Firebase Console by pasting the rules.

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for party data"
```

---

### Task 17: Firebase Hosting & Deployment

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`

**Step 1: Initialize Firebase Hosting config**

Create `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

Create `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Replace `your-firebase-project-id` with the actual Firebase project ID.

**Step 2: Build and deploy**

Run:
```bash
npm run build
firebase deploy
```

Expected: App is live at `https://your-project.web.app`.

**Step 3: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "feat: add Firebase hosting config for SPA deployment"
```

---

### Task 18: End-to-End Smoke Test

**No new files — manual verification.**

**Step 1: Test party creation**
1. Open the deployed app at root `/`
2. Enter party name and host PIN
3. Click "Create Party"
4. Verify QR code appears with correct URL

**Step 2: Test guest join**
1. Open the party URL (or scan QR)
2. Enter a name, click "Join"
3. Verify redirect to ballot page with all 24 categories

**Step 3: Test voting**
1. Tap nominees to vote in several categories
2. Open ballot in another browser/incognito to join as second guest
3. Verify both guests' votes are independent

**Step 4: Test host controls**
1. Click "Host Mode" in footer
2. Enter host PIN
3. Lock a category — verify guests can no longer vote on it
4. Select a winner — verify it auto-locks and highlights
5. Test "Lock All" / "Unlock All"

**Step 5: Test leaderboard**
1. Navigate to leaderboard
2. Verify scores update in real-time as winners are announced
3. Verify ranking order is correct

**Step 6: Test category breakdown**
1. Navigate to categories view
2. Expand a category
3. Verify vote counts and bars are correct
4. Verify winner is marked after announcement

**Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|-----------------|
| 0 | Local Tooling Setup with Mise | 5 |
| 1 | Project Scaffolding | 8 |
| 2 | Firebase Configuration | 5 |
| 3 | Seed Data — 2026 Nominees | 2 |
| 4 | Firestore Helpers — Party | 5 |
| 5 | Firestore Helpers — Guests | 5 |
| 6 | Firestore Helpers — Categories & Votes | 9 |
| 7 | Real-Time Hooks | 5 |
| 8 | Scoring Logic | 5 |
| 9 | Router & Page Shells | 5 |
| 10 | Party Creation Page | 3 |
| 11 | Guest Join Page | 3 |
| 12 | Ballot Page — Voting UI | 4 |
| 13 | Host Mode Toggle | 4 |
| 14 | Leaderboard Page | 3 |
| 15 | Category Breakdown Page | 3 |
| 16 | Firestore Security Rules | 3 |
| 17 | Firebase Hosting & Deployment | 3 |
| 18 | End-to-End Smoke Test | 7 |

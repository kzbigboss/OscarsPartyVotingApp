# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint (flat config)
npm run prepare      # Install pre-commit hook (runs automatically after npm install)
npx vitest run       # Run all tests once
npx vitest run src/firebase/__tests__/parties.test.js  # Run a single test file
mise install         # Install pinned Node 22.22.0 + firebase-tools
mise exec -- firebase deploy  # Deploy to Firebase Hosting
mise exec -- firebase deploy --only firestore:rules  # Deploy Firestore security rules only
```

## Architecture

Real-time Oscars party voting app. React 19 SPA with Firebase Firestore as the backend — no server code.

### Data Flow

Guests join via QR code URL → enter name → get a 3-digit guestId (100-999) stored in `localStorage` keyed by `guest_{partyCode}`. All real-time data flows through Firestore `onSnapshot` listeners wrapped in custom hooks (`src/hooks/`). Scoring is computed client-side in `src/utils/scoring.js` to stay on Firebase's free Spark plan.

### Firestore Data Model

```
parties/{partyCode}          → name, hostPinHash, createdBy, createdAt, allLocked
  /categories/{categoryId}   → name, sortOrder, nominees[], locked, winnerId
  /guests/{guestId}          → displayName, isHost, score, joinedAt
  /votes/{guestId}_{catId}   → guestId, categoryId, nomineeId, timestamp
```

Vote document IDs use the composite key `{guestId}_{categoryId}` for natural deduplication — writing a new vote for the same category overwrites the previous one.

### Key Layers

- **`src/firebase/`** — Firestore write helpers (createParty, castVote, lockCategory, selectWinner, etc.). Each function takes `partyCode` as the first arg and builds doc refs from it.
- **`src/hooks/`** — Real-time read hooks (useParty, useCategories, useGuests, useVotes). Each returns `{ data, loading }` and cleans up its `onSnapshot` listener on unmount.
- **`src/pages/`** — Route-level components. Each page reads from hooks and calls firebase helpers for writes.
- **`src/components/`** — Reusable UI (NavBar, CategoryCard, HostModeToggle).
- **`src/data/oscars2026.js`** — Seed data for all 24 Oscar categories with nominees.

### Host Mode

Host mode is activated by entering a PIN via `HostModeToggle`. It sets `isHost: true` on the guest's Firestore doc and in localStorage. The Ballot page conditionally shows lock/unlock/winner controls when `hostMode` is true. There is no Firebase Auth — security relies on the trusted party setting.

### Styling

CSS variables in `src/theme/variables.css` (colors, spacing, radius). Each component has a co-located `.css` file. Pages with a floating top menu need `padding-top: 50px`; all pages with the bottom NavBar need `padding-bottom: 80px` and a `<div className="nav-spacer" />`.

## Testing

Tests use Vitest with jsdom. Firebase modules are mocked with `vi.mock('firebase/firestore')` — mock `doc()` must return a truthy value (e.g., `'mock-doc-ref'`) since `expect.anything()` doesn't match `undefined`. Use `beforeEach(() => { vi.clearAllMocks() })` to prevent cross-test contamination of call counts.

## Environment

Firebase config lives in `.env.local` (git-ignored) using `VITE_FIREBASE_*` variable names, accessed via `import.meta.env.VITE_*` in `src/firebase/config.js`.

Party codes are 6-char alphanumeric strings generated from a charset that excludes ambiguous characters (no 0/O/1/I/L).

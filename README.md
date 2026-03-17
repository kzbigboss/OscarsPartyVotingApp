# Oscars Party Voting

A real-time web app for hosting Oscar night voting parties. Guests scan a QR code, pick their winners across all 24 categories, and watch the leaderboard update live as the ceremony unfolds. Replaces the paper ballot handouts we used to print each year.

## How It Works

1. **Host creates a party** — Sign in with Google, name your party, set a host PIN
2. **Guests join via QR code** — Scan the code or enter the 6-character party code, then pick a display name
3. **Everyone votes** — Swipe through categories and tap your predicted winner for each
4. **Host announces winners** — As each Oscar is awarded, the host locks the category and selects the winner
5. **Leaderboard updates live** — Scores recalculate in real time so guests can see who's winning

## Features

- **Real-time sync** — All votes, scores, and winner announcements update instantly across all devices via Firestore
- **QR code sharing** — Easy party join links with scannable QR codes on the ballot and leaderboard
- **Host controls** — Lock/unlock categories, select winners, delegate host powers via PIN
- **Observer mode** — Read-only leaderboard and vote breakdown for display on a TV or monitor
- **Consensus suggestions** — See which nominee the group is leaning toward before locking
- **Maintenance mode** — Kill switch to take the app offline without redeploying
- **Mobile-first design** — Built for phones at a party, but works on any screen size

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Vite |
| Backend | Firebase Firestore (serverless — no server code) |
| Auth | Firebase Auth (Google Sign-In for hosts) |
| Hosting | Firebase Hosting |
| Testing | Vitest, Playwright (load testing) |
| CI | GitHub Actions (lint, build, test on every push) |

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) — `mise install` pins Node 22 and firebase-tools to the exact versions used by this project
- A Firebase project with Firestore and Authentication enabled

### Setup

```bash
git clone https://github.com/kzbigboss/OscarsPartyVotingApp.git
cd OscarsPartyVotingApp
mise run setup
```

This installs the pinned Node and firebase-tools versions, runs `npm install`, and auto-populates `.env.local` from your Firebase project config (requires `firebase login` first).

### Development

```bash
npm run dev          # Start dev server at localhost:5173
npm run lint         # Run ESLint
npx vitest run       # Run tests
npm run build        # Production build
```

A pre-commit hook is installed automatically during setup. It scans every staged file for sensitive data — API keys, private keys, tokens, credentials files, and other secret patterns — and blocks the commit if anything is detected. It also warns on files over 1 MB.

### Deployment

```bash
mise exec -- firebase deploy                          # Deploy everything
mise exec -- firebase deploy --only firestore:rules   # Deploy security rules only
```

## Project Structure

```
src/
├── pages/          # Route-level components (Home, Ballot, Leaderboard, etc.)
├── components/     # Reusable UI (NavBar, CategoryCard, ScoreIndicator, etc.)
├── firebase/       # Firestore write helpers and auth
├── hooks/          # Real-time data hooks (onSnapshot listeners)
├── context/        # React context (Auth provider)
├── utils/          # Scoring logic
├── data/           # Oscar categories and nominees seed data
└── theme/          # CSS variables
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation, Firestore data model, and developer conventions.

# Oscars Party Voting App — Design Document

**Date:** 2026-02-07
**Status:** Approved

## Overview

A web-based party voting app where guests predict Oscar winners, the host logs actual results, and a live leaderboard tracks who has the most correct picks. Built for a single-night event with 10-25 guests.

## User Flows

### Guest Flow

1. Scan a QR code displayed at the party (contains the party URL with embedded party code)
2. Enter a display name — assigned a unique numeric ID, displayed as "Name (ID)"
3. Session is stored in browser `localStorage` (no PIN, no accounts)
4. Browse all categories and nominees, tap to vote on each
5. Can change votes anytime until the host locks a category
6. View live leaderboard and per-category breakdowns as winners are announced

### Host Flow

1. Create a party — set a party name and host PIN, receive a party code + QR code
2. Optionally edit pre-populated 2026 Oscar categories and nominees (add, remove, edit)
3. Join as a regular voter with the same ballot as guests
4. Activate host mode via a "Host Mode" link by entering the host PIN
5. Host controls appear inline: lock/unlock categories (individually or all at once), select winners
6. Selecting a winner auto-locks that category and updates the leaderboard in real-time

## Data Model

### Party

| Field       | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| partyId     | string    | Auto-generated, embedded in QR code URL    |
| hostPin     | string    | PIN the host sets at party creation         |
| name        | string    | e.g. "Mark's Oscar Party 2026"             |
| createdAt   | timestamp | When the party was created                 |
| allLocked   | boolean   | Bulk lock/unlock toggle                    |

### Category

| Field      | Type    | Description                                    |
|------------|---------|------------------------------------------------|
| categoryId | string  | Auto-generated                                 |
| name       | string  | e.g. "Best Picture"                            |
| nominees   | array   | List of objects: { id, name, detail }          |
| winnerId   | string  | null until host selects a winner               |
| locked     | boolean | Whether voting is closed for this category     |
| sortOrder  | number  | Controls display order                         |

### Guest

| Field       | Type    | Description                                   |
|-------------|---------|-----------------------------------------------|
| guestId     | string  | Auto-generated numeric ID, stored in localStorage |
| displayName | string  | Guest-chosen name                             |
| isHost      | boolean | Set to true when host PIN is entered          |
| score       | number  | Running count of correct picks                |

### Vote

| Field      | Type      | Description                                   |
|------------|-----------|-----------------------------------------------|
| guestId    | string    | References the guest                          |
| categoryId | string    | References the category                       |
| nomineeId  | string    | The nominee they picked                       |
| timestamp  | timestamp | When the vote was last updated                |

**Scoring:** When the host sets a `winnerId` on a category, the app compares every guest's vote for that category and increments `score` for correct matches. Real-time Firestore listeners push updates to all connected devices.

## Tech Stack

- **Frontend:** React (via Vite), React Router, plain CSS with theming support
- **Backend:** Firebase (free Spark plan) — Firestore for real-time data, Firebase Hosting
- **No server-side code** — all logic runs client-side, Firestore security rules handle access control

### Project Structure

```
src/
  components/    — reusable UI (CategoryCard, NomineeList, Leaderboard, etc.)
  pages/         — top-level routes (Join, Ballot, Results, PartySetup)
  firebase/      — Firebase config and Firestore helpers
  hooks/         — custom React hooks for real-time data subscriptions
  theme/         — CSS variables file, easy to swap for themed version
```

### Routes

| Route                       | View                 | Description                              |
|-----------------------------|----------------------|------------------------------------------|
| `/`                         | Landing              | Create a new party                       |
| `/:partyCode`               | Join                 | Guest enters name to join                |
| `/:partyCode/ballot`        | Ballot               | Vote on categories                       |
| `/:partyCode/leaderboard`   | Leaderboard          | Ranked list of guests by correct picks   |
| `/:partyCode/categories`    | Category Breakdown   | Per-category vote distribution + winners |

## Security & Access Control

- Anyone with a valid party code can read party data
- Only the guest who owns a vote can create or edit it (matched by `guestId` in localStorage)
- Votes on locked categories are rejected at the Firestore rules level
- Only guests with `isHost: true` can lock/unlock categories, select winners, or edit nominees
- No Firebase Auth — `guestId` passed as custom identifier; sufficient for a trusted party setting

## UI Layout

### Join Screen

- Party name displayed at top
- "Enter your name" text field + "Join" button
- After joining, redirects to Ballot view

### Ballot View

- List of all categories with nominees
- Tap a nominee to vote (highlighted state)
- Locked categories show lock icon, votes visible but not editable
- Categories with announced winners show winner highlighted
- Bottom nav bar: Ballot | Leaderboard | Categories

### Leaderboard View

- Ranked list of all guests sorted by correct picks (descending)
- Each row: rank, display name (ID), score (e.g. "5/12")
- Updates in real-time

### Category Breakdown View

- List of categories, tap to expand
- Expanded view: each nominee with count/bar of how many guests voted for them
- Winner marked if announced

### Host Controls (inline, visible in host mode)

- Per-category: "Lock" / "Unlock" toggle, "Select Winner" control
- Top of ballot: "Lock All" / "Unlock All" buttons
- Visual indicator that host mode is active

## Theming

- Start with a clean, functional design (plain CSS with CSS variables)
- Theme layer is isolated in `src/theme/` — CSS variables for colors, fonts, spacing
- Oscar theme (gold/black, trophy icons, etc.) can be applied later by swapping the variables file without touching component logic

## Pre-populated Data

- App ships with real 2026 Oscar categories and nominees
- Host can add, remove, or edit categories and nominees through the admin controls
- Supports custom categories (e.g. "Best Dressed")

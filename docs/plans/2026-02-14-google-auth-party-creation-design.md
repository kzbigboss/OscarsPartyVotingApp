# Google Auth for Party Creation — Design

## Problem

Party creation is open to anyone who visits the Home page. There is no identity verification. This feature gates party creation behind Google sign-in, restricted to a single allowed Google account.

## Decisions

- **Auth scope:** Only the app owner's Google account can create parties. All other users (guests) are unaffected — no sign-in required to join, vote, or view leaderboards.
- **Home page UX:** Unauthenticated visitors see only a "Sign in with Google" button. The party creation form appears after sign-in if the UID matches the allowed host.
- **Auto-host on join:** When the party creator joins their own party, they are auto-granted host mode if they are signed in at that moment (active Firebase Auth session required, not localStorage).
- **Allowed UID storage:** `VITE_ALLOWED_HOST_UID` environment variable in `.env.local`. Client-side UX gate only — server-side enforcement deferred to issue #4 (Firestore rules).
- **PIN-based host mode:** Unchanged. Still works for delegating host access to others.

## Data Model

One field added to the party document:

```
parties/{partyCode} → name, hostPinHash, createdAt, allLocked, createdBy (string, Firebase Auth UID)
```

No other collections change.

## Architecture

**Approach:** AuthContext + inline gate in Home.jsx.

- `AuthProvider` wraps the app, runs a single `onAuthStateChanged` listener, provides `{ user, loading }` via React Context.
- Home.jsx checks `user.uid === import.meta.env.VITE_ALLOWED_HOST_UID` to show/hide the creation form.
- Join.jsx checks `user?.uid === party.createdBy` to auto-grant host mode.

## File Changes

| Action | File | Change |
|--------|------|--------|
| modify | `src/firebase/config.js` | Export `auth` instance |
| new | `src/firebase/auth.js` | `signInWithGoogle()`, `signOutUser()` |
| new | `src/hooks/useAuth.js` | Hook wrapping `onAuthStateChanged` |
| new | `src/context/AuthContext.jsx` | `AuthProvider` + `useAuthContext()` |
| modify | `src/firebase/parties.js` | Add `createdBy` param to `createParty()` |
| modify | `src/firebase/guests.js` | Add optional `isHost` param to `joinParty()` |
| modify | `src/pages/Home.jsx` | Sign-in gate, pass `user.uid` to `createParty()` |
| modify | `src/pages/Join.jsx` | Auto-host check comparing auth UID to `party.createdBy` |
| modify | `src/App.jsx` | Wrap routes with `<AuthProvider>` |
| new | `src/firebase/__tests__/auth.test.js` | Test auth helpers |
| modify | `src/firebase/__tests__/parties.test.js` | Test `createdBy` field |
| modify | `src/firebase/__tests__/guests.test.js` | Test `isHost` param |
| add | `.env.local` | `VITE_ALLOWED_HOST_UID` variable |

## Unchanged

- PIN-based host mode (`HostModeToggle`)
- All guest flows (join, vote, leaderboard)
- Existing hooks, components, utils, data, theme

## Security Notes

- `VITE_ALLOWED_HOST_UID` is bundled into client JS. This is a UX gate, not a security boundary. The UID is a public identifier (also stored as `createdBy` in Firestore, readable by guests).
- Server-side enforcement via Firestore security rules is tracked in issue #4, which depends on this feature.
- Firebase Auth on the Spark (free) plan supports Google sign-in with up to 10,000 monthly active users.

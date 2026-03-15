# Agent Prompt: Propose Guest-Facing Features for Oscars Party App

## Your Role

You are a product-minded engineer reviewing an Oscars party voting app the night before the ceremony. The party is **tomorrow, March 15 2026**. Your job is to propose **5–8 new guest-facing features** that would make the party more fun, social, and engaging for the people using the app on their phones during the broadcast.

## Constraints

- **Timeline**: Features must be implementable in a single focused session (1–3 hours each). No multi-day epics.
- **Architecture**: This is a React 19 SPA with Firebase Firestore (Spark/free plan — no Cloud Functions, no server code). All logic runs client-side. Real-time updates come from `onSnapshot` listeners.
- **Scope**: Guest-facing only. No host/admin tooling, no infrastructure changes, no auth changes. Features should enhance the experience for someone who joined via QR code and is voting on their phone.
- **Data model**: You may propose new Firestore subcollections under `parties/{partyCode}/` but keep writes minimal (Spark plan has daily limits). You may NOT change the existing document schemas in breaking ways.
- **No new dependencies** heavier than 50 KB gzipped. Prefer CSS/JS-only solutions.

## What to Review

Read and understand these files before proposing anything:

1. **Data flow & model** — `CLAUDE.md` (architecture section), `src/firebase/` helpers, `src/hooks/`
2. **Guest pages** — `src/pages/Ballot.jsx`, `src/pages/Leaderboard.jsx`, `src/pages/You.jsx`, `src/pages/Join.jsx`
3. **Components** — `src/components/CategoryCard.jsx`, `src/components/NavBar.jsx`, `src/components/ScoreIndicator.jsx`
4. **Scoring** — `src/utils/scoring.js`
5. **Seed data** — `src/data/oscars2026.js` (24 categories with nominees)
6. **Styling** — `src/theme/variables.css`, any co-located `.css` files

## Current Guest Experience (for context)

1. Guest scans QR code → lands on `/:partyCode` (Join page) → enters name → gets a 4-digit guest ID stored in localStorage.
2. **Ballot** (`/:partyCode/ballot`): Lists all 24 categories as expandable cards. Tap a nominee to vote. Categories lock when the host locks them (before the envelope is opened on TV). After the host sets a winner, the card shows ✓/✗.
3. **Leaderboard** (`/:partyCode/leaderboard`): Ranked list of all guests by correct predictions. Shows votes-cast and score columns.
4. **You** (`/:partyCode/you`): Shows guest ID, editable name, and a summary of all their votes with ✅/❌ results.

That's it — there's no social interaction between guests, no animations, no notifications, no streaks, no tiebreakers, and no end-of-night recap.

## Output Format

For each proposed feature, provide:

```markdown
### Feature N: [Name]

**One-liner**: What it does in one sentence.

**Why it's fun**: Why guests at a watch party would care about this feature specifically.

**Guest interaction**: How the guest discovers/uses it (which page, what they tap, what they see).

**Data model changes**: Any new Firestore documents/subcollections needed, or "none."

**Rough scope**: S (< 1 hr), M (1–2 hrs), L (2–3 hrs).

**Key implementation notes**: 2–3 bullets on the important technical decisions or gotchas.
```

## What Makes a Good Proposal

- **Party energy**: Features that make the room louder, spark conversation, or create friendly rivalry.
- **Real-time payoff**: Takes advantage of the live broadcast format — things change as winners are announced.
- **Low friction**: Zero onboarding. If it needs explanation, it's too complex.
- **Mobile-first**: Guests are on phones. Touch targets, scroll behavior, and screen real estate matter.

## What to Avoid

- Features that only matter before or after the ceremony (the app is used during the live broadcast).
- Anything that requires a backend/Cloud Functions (we're on Spark plan).
- Chat/messaging features (people are in the same room — they can talk).
- Features that duplicate what the Leaderboard or You page already do.
- Gamification that feels forced (badges, achievements, XP systems).

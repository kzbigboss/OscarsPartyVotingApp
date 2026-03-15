# Proposed Guest-Facing Features for Oscars Party App

**Date**: 2026-03-14
**Context**: Features to ship before the March 15, 2026 ceremony broadcast. All features are guest-facing, client-side only, and compatible with Firebase Spark plan constraints.

---

### Feature 1: Live Winner Reveal Animation

**One-liner**: When the host sets a winner, every guest's Ballot page plays a brief animation that highlights whether they got it right or wrong.

**Why it's fun**: The moment the envelope opens is the highest-energy moment of each category. Right now, the card just silently updates. A 1.5-second animation with a green flash + confetti burst for correct picks (or a red shake for wrong ones) turns every announcement into a shared dopamine hit across the room. People will audibly react to their phones, which makes the room louder.

**Guest interaction**: Fully automatic -- no tap required. When a category's `winnerId` changes from `null` to a value via the existing `onSnapshot` listener, the CategoryCard triggers a CSS animation. Correct picks get a green glow + a brief confetti-like particle effect (CSS-only). Wrong picks get a subtle red shake. Guests who didn't vote on that category see a neutral gold highlight on the winner. The animation plays once and then settles to the current static result state.

**Data model changes**: None. The trigger is the existing `winnerId` field changing from `null` to a value, detectable client-side by comparing previous and current category state.

**Rough scope**: M (1-2 hrs).

**Key implementation notes**:
- Track previous `winnerId` per category using a `useRef` map in Ballot.jsx. When it transitions from `null` to non-null, set a `justRevealed` flag on that category that auto-clears after 2 seconds.
- Pass `justRevealed` as a prop to CategoryCard. Use CSS `@keyframes` for the glow/shake -- no JS animation library needed.
- Confetti can be done with a small CSS pseudo-element particle burst (8-10 squares animating outward with `opacity` and `transform`), keeping bundle size at zero.
- Auto-expand the revealed category card if it was collapsed, so guests see the full result.

---

### Feature 2: Confidence Picks (Double Down on 3 Categories)

**One-liner**: Each guest selects up to 3 categories as their "confidence picks" before the ceremony, earning double points if they guess those winners correctly.

**Why it's fun**: Flat scoring (1 point per correct pick) means the leaderboard often has clusters of tied guests. Confidence picks add a strategic layer -- "I *know* Best Picture is going to Sinners" -- and create bragging-rights moments when a confidence pick hits. It also sparks pre-ceremony debate: "You're doubling down on THAT?"

**Guest interaction**: On the Ballot page, each unlocked CategoryCard gets a small star/shield icon button. Tapping it toggles that category as a confidence pick (max 3, enforced client-side with a toast if they try to add a 4th). Confidence-picked categories show a gold accent border. On the Leaderboard, the score column reflects the weighted total (correct confidence picks = 2 pts, others = 1 pt). The You page shows which categories are confidence picks.

**Data model changes**: New field on the existing vote document: `confidence: true|false`. Since vote docs already use the composite key `{guestId}_{categoryId}`, this adds one boolean field per vote doc -- no new subcollection needed. Write volume stays the same (one `setDoc` per vote, just with an extra field).

**Rough scope**: M (1-2 hrs).

**Key implementation notes**:
- Extend `castVote` in `src/firebase/votes.js` to accept an optional `confidence` boolean. Default to `false` for backward compatibility.
- Add a separate `setConfidence(partyCode, guestId, categoryId, isConfidence)` helper that updates just the `confidence` field on the existing vote doc via `updateDoc`.
- Update `calculateScores` in `src/utils/scoring.js`: for announced categories, a correct vote with `confidence: true` scores 2 instead of 1. This keeps scoring deterministic and client-side.
- Confidence picks should lock along with the category (once locked, the star can't be toggled), so all strategic decisions are made before the envelope opens.

---

### Feature 3: Crowd Consensus Bar on Each Category

**One-liner**: Each CategoryCard shows a horizontal bar chart of how the room voted, visible once the category is locked.

**Why it's fun**: Guests constantly wonder "what did everyone else pick?" Showing the vote distribution right before the winner is announced creates anticipation and reveals contrarian picks. When someone's the only person who voted for the underdog and it wins, the room erupts. It turns individual voting into a collective experience.

**Guest interaction**: Once the host locks a category, a compact horizontal bar chart appears at the bottom of the expanded CategoryCard showing the percentage breakdown across nominees (e.g., "Sinners 45% | Hamnet 30% | ..."). Before locking, no distribution is shown (to prevent bandwagoning). The guest's own pick is subtly highlighted in the bar. After the winner is announced, the winning nominee's bar segment turns gold.

**Data model changes**: None. All vote data is already loaded via `useVotes`. The distribution is computed client-side by filtering the votes array for that category and counting nominee selections.

**Rough scope**: M (1-2 hrs).

**Key implementation notes**:
- Compute the distribution in the Ballot component (or in a `useMemo`) by grouping `votes.filter(v => v.categoryId === cat.id)` by `nomineeId` and counting. Pass the distribution object as a prop to CategoryCard.
- Only render the bar when `category.locked === true` to prevent strategic bandwagoning.
- Use simple CSS `flex-grow` or percentage widths for the bar segments. Each segment gets the nominee's first name as a label. Keep it to a single row, ~24px tall, so it doesn't bloat the card.
- Highlight the guest's own pick segment with a subtle border/outline.

---

### Feature 4: Hot Streak and Upset Tracker

**One-liner**: A persistent banner at the top of the Ballot page shows your current streak of correct picks in a row and calls out when an upset occurs (the room's least-picked nominee wins).

**Why it's fun**: Streaks create escalating tension -- "I'm 4 for 4, don't break the streak!" People will announce their streaks to the room. Upset alerts create collective shock moments -- "NOBODY saw that coming!" Both are zero-effort for the guest and feed on the live broadcast pacing.

**Guest interaction**: A compact banner sits just below the ballot title row. It shows "Streak: 3" (with fire emoji scaling for longer streaks) when the guest has consecutive correct picks in announcement order. When a winner is announced and fewer than 20% of the room voted for them, the banner briefly flashes "UPSET!" with a distinct animation. Both update automatically in real time as winners are announced.

**Data model changes**: None. Streak is computed client-side by iterating announced categories in `sortOrder`, checking the guest's vote against the winner in sequence, and counting the longest trailing run of correct picks. Upset detection uses the same vote distribution data (count votes per nominee, check if the winner got < 20% of votes).

**Rough scope**: S (< 1 hr).

**Key implementation notes**:
- Compute streak in Ballot.jsx: filter categories where `winnerId` is set, sort by `sortOrder`, iterate from the end backwards, count consecutive correct picks until a miss. This gives the "current" trailing streak.
- For upsets: when `winnerId` is set, count how many votes went to that nominee vs. total votes for the category. If below 20%, mark it as an upset. Show a toast-style animation that auto-dismisses after 3 seconds.
- This component is purely derived state -- no writes, no new data, just a `useMemo` over existing `categories` and `votes` arrays.

---

### Feature 5: "Who Picked That?" Reveal After Winner Announcement

**One-liner**: After a winner is announced, tapping any nominee in that category shows a list of guests who voted for them.

**Why it's fun**: The moment a winner is announced, everyone wants to know "Who called that?" and "Who picked the obvious wrong answer?" This turns the ballot from a private activity into a social one. It creates real-room moments: "Wait, YOU picked Bugonia for Best Picture?!" People will lean over and compare picks.

**Guest interaction**: After a category has a `winnerId` set, the nominee list items become tappable and expand to show a list of guest names who voted for that nominee. The winner nominee shows a count badge (e.g., "4 picked this"). No interaction needed before the winner is announced -- vote secrecy is preserved until the envelope opens.

**Data model changes**: None. All votes are already loaded via `useVotes`, and all guests via `useGuests`. The mapping is computed client-side: filter votes by `categoryId`, group by `nomineeId`, then look up `displayName` from the guests array.

**Rough scope**: M (1-2 hrs).

**Key implementation notes**:
- Only render the voter list when `category.winnerId` is truthy (preserves vote secrecy pre-announcement).
- Pass the full votes array and guests array (or a pre-computed map) to CategoryCard. Inside the card, when a nominee `<li>` is tapped post-announcement, toggle a small dropdown showing guest names.
- The Leaderboard page already loads guests and votes, but the Ballot page currently only uses `useVotes`. It will need to also call `useGuests(partyCode)` -- this is one additional `onSnapshot` listener, which is fine.
- Keep the voter name list compact: show names inline, comma-separated, max 2 lines with an ellipsis and count for overflow.

---

### Feature 6: Ballot Completion Progress Bar

**One-liner**: A progress bar at the top of the Ballot shows how many of the 24 categories the guest has voted on, with a nudge when categories are about to be locked.

**Why it's fun**: With 24 categories, it's easy to lose track of which ones you skipped, especially the technical categories buried at the bottom. A visual progress bar creates a satisfying completionist drive. The "about to lock" nudge adds urgency -- guests will frantically scroll to fill in their remaining picks before the host locks them, creating a fun scramble.

**Guest interaction**: A thin progress bar (4px tall, gold fill) sits below the sticky title row, showing `votedCount / totalCategories`. Below it, a text line says "18/24 voted" and -- when any unlocked categories have no vote from this guest -- "6 categories need your pick." When a category transitions from unlocked to locked and the guest hadn't voted on it, a brief toast appears: "Best Sound locked -- you missed it!"

**Data model changes**: None. Vote count is already computed from the `myVotes` object in Ballot.jsx. Lock status comes from the existing `categories` data.

**Rough scope**: S (< 1 hr).

**Key implementation notes**:
- The `myVotes` object and `categories` array are already available in Ballot.jsx. The progress bar is a simple `div` with `width: ${(votedCount / totalCategories) * 100}%`.
- For the "you missed it" toast: track previous lock state per category using a `useRef` map. When a category transitions from `locked: false` to `locked: true` and `myVotes[cat.id]` is undefined, show a toast via the existing `showError` pattern (but styled as a warning rather than an error).
- Scrolling to unvoted categories: add an optional "Fill in remaining" button that scrolls to the first unvoted, unlocked category and expands it. Use `scrollIntoView({ behavior: 'smooth' })`.

---

### Feature 7: End-of-Night Shareable Results Card

**One-liner**: After all 24 winners are announced, the You page transforms into a shareable results card showing the guest's final score, rank, best picks, and worst misses.

**Why it's fun**: The ceremony ends and everyone wants to compare results and brag (or commiserate). A polished results card that can be screenshot-shared to social media or group chats extends the party beyond the room. "I got 17/24 and called the Best Picture upset" is the kind of thing people post on Instagram stories.

**Guest interaction**: When all 24 categories have a `winnerId`, the You page shows a new "Your Results" card at the top with: final score and rank out of N guests, a visual bar comparing their score to the group average, their best streak, and notable picks (correct upsets, lone correct votes). Below the card, a "Share Results" button copies a pre-formatted text summary to the clipboard, or uses the Web Share API if available.

**Data model changes**: None. All data needed (scores, votes, categories, guests) is already available from existing hooks. Rank is computed the same way as the Leaderboard page.

**Rough scope**: L (2-3 hrs).

**Key implementation notes**:
- Detect "all announced" by checking `categories.every(c => c.winnerId)`. Only then render the results card; otherwise, the You page looks as it does today.
- Computing rank requires guest scores, so the You page will need to add `useGuests(partyCode)` to get all guests, then run `calculateScores` and sort. This matches what Leaderboard already does.
- For the share button: try `navigator.share({ text: ... })` first (works on iOS Safari and Android Chrome). Fall back to `navigator.clipboard.writeText(...)`. The text format should be something like: "Oscars 2026 Party -- I scored 17/24 (Rank #2 of 8 guests)! Called the Best Picture upset."
- Style the results card with a dark background (`--color-primary`) and gold accents (`--color-accent`) to make it visually distinct and screenshot-worthy.

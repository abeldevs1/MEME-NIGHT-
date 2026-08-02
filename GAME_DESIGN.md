# Meme Me — Technical Design Document

A virtual, web-based multiplayer party game inspired by the physical card game
**"What Do You Meme?"** (Meme Me). Built on the existing Meme Night stack:
Next.js 15 (App Router), React 19, Supabase (Postgres + Realtime broadcast/DB
streams), Tailwind v4.

The existing app already has the image vault (`memes`), rooms, submissions,
leaderboard, rounds and voting. This design **re-uses that** and adds the caption
deck + judge loop that makes it What Do You Meme.

---

## 1. Game Concept & Rules

### 1.1 Core loop (What Do You Meme? in one paragraph)

> Each round the **Judge** (rotating) picks an **Image Card** from the vault/Giphy.
> Every other player plays **one Caption Card from their hand** — the funniest
> text they have for that image. The Judge secretly picks the best pairing.
> The player whose caption got picked wins the round; the judge gets a point for
> being a good judge. Then the table is refreshed.

### 1.2 Players & roles

- **3–8 players** per room.
- Each round exactly **1 Judge**, the rest are **Submitters**.
- Judge rotates each round (clockwise), so everyone judges eventually.
- No sign-in. A player is identified by the existing `localStorage` player id.

### 1.3 Cards

| Card | Source | Behaviour |
|---|---|---|
| **Image Card** (prompt) | Vault `memes` + Giphy GIFs | Judge picks one per round. Supports static images **and** animated GIFs. |
| **Caption Card** | Shared deck seeded from `PROMPTS` in `src/lib/prompts.ts` + custom decks | Each player holds a **hand of 7**. Play one per round. Played cards are discarded; hand refills to 7. |

### 1.4 Scoring

- Submitter whose caption wins: **+1 point**.
- Judge: **+1 point** for each round they judge (incentive to be fair — judges
  score whether or not they pick well).
- Optional **Twists** (reuse existing `Twist`): Double Trouble = double points
  that round, etc.

### 1.5 Win condition

- **First to 10 points** (configurable) wins the night; or play N rounds.

---

## 2. Real-Time Architecture & Gameplay Loop

### 2.1 Room state machine

```
          player_join ─────────────────────────────► ┌──────────┐
                                                    │  LOBBY   │
                                             ┌─────►│          │◄──┐
                                             │      └──────────┘   │
              judge_pick_image (Judge)       │            │        │ round_end
                                             │            ▼        │
                                        ┌────┴─────┐   ┌──────────────┐
                                        │ SUBMITTING│──►│  JUDGING     │
                                        │ (captions│   │ (captions    │
                                        │  hidden) │   │  revealed)   │
                                        └──────────┘   └──────┬───────┘
                                            ▲                  │ judge_pick (Judge)
                                            │                  ▼
                                  timeout /  └──────────┐  ┌──────────┐
                                   all_submitted        │  │ ROUND_END│
                                                        └──│ +score + │
                                                           │  next    │
                                                           └──────────┘
```

States (extend the existing `rooms.status` check):
`lobby → submitting → judging → round_end → submitting … → ended`

### 2.2 Event list (Supabase Realtime broadcast)

| Event | Emitter | Payload | Notes |
|---|---|---|---|
| `player_join` | any | `{player_id, player_name}` | upsert `players`; update roster |
| `judge_pick_image` | Judge | `{round, image:{url,width,height}}` | Reveals image to all; starts submit timer |
| `draw_hand` | server/host | `{player_id, cards:[…]}` | Fisher-Yates dealt from deck |
| `play_card` | Submitter | `{round, player_id, card_text}` | Server anonymizes + shuffles before judging |
| `card_played` | any | `{round, played_count, total}` | progress tick |
| `reveal_captions` | Judge | `{round, captions:[{id, text}]}` | **no player names**, shuffled order |
| `judge_pick` | Judge | `{round, caption_id}` | Host names winner |
| `round_end` | host | `{round, winner, points}` | updates leaderboard; confetti |
| `timeout` | host | `{round, phase}` | autoskip stragglers |
| `judge_disconnected` | host | `{player_id}` | reassign judge / pause |
| `ended` | host | `{}` | game over, leaderboard |

### 2.3 Anonymization of submissions (critical for judging)

The Judge must **not** know whose caption is whose. Two layers:

1. **DB layer** — `round_captions` stores `player_id` but the Judge view never
   requests it. The broadcast `reveal_captions` payload is built **server-side
   (host)** and contains only `{caption_id, text}`.
2. **Shuffle layer** — the host shuffles the reveal list with Fisher–Yates, so
   order leaks nothing:

```pseudo
function fisherYatesShuffle(items):
  for i from items.length - 1 down to 1:
    j = Math.floor(Math.random() * (i + 1))
    swap(items[i], items[j])
  return items

// Host, before reveal_captions broadcast:
captions = rows.where(round == R).map(r -> { id: r.id, text: r.text })
captions = fisherYatesShuffle(captions)      // strip player_id
broadcast("reveal_captions", { round: R, captions })
```

When the Judge picks `caption_id`, the host looks up the owner server-side and
scores them — never sending the mapping to the judge's own screen.

### 2.4 Hand deck management (Fisher–Yates)

Deck = base `PROMPTS` + any custom deck for the room. Dealt per player per round:

```pseudo
deck = roomDeck.duplicate()
deck = fisherYatesShuffle(deck)
for each player who needs cards:
  hand = deck.draw(needed)          // pop from front
  saveHand(player, hand)            // hand_cards table, upsert

// Refill after each round: player always plays exactly 1, discards it,
// then draws back up to HAND_SIZE (7).
```

### 2.5 Disconnection & timeout edge cases

| Scenario | Behaviour |
|---|---|
| **Judge disconnects mid-round** | Host auto-reassigns to next player after 10s grace, or pauses timer and shows "Judge left". Existing presence (`channel.presenceState()`) detects this. |
| **Player fails to submit before timer** | Server auto-plays a random card from their hand (marked "auto"), or forfeits if hand empty. Timer 45s (configurable). |
| **Player rejoins** | `players` upsert keeps roster; hand reloaded from `hand_cards`. |
| **Host (room row) disappears** | Existing `takeover` flow promotes a player to host. |
| **All players disconnect** | Room idle > 15min → host cleans up rows (a cron/Edge Function or on next open). |

Timeout loop (host-side, `setInterval` per phase):

```pseudo
phaseTimer = start(SUBMIT_SECONDS)
on tick:
  if phase == submitting and remaining == 0:
    for each player with no play_card: autoPlayRandomCard(player)
    broadcast("reveal_captions", …)
  if phase == judging and judge has not picked and remaining == 0:
    autoPick = pickHighestVoteIfAny() ?? randomCaption()
    applyRoundEnd(autoPick)
```

---

## 3. Data Model Schemas

Existing tables reused: `rooms`, `players`, `leaderboard`, `rounds`, `memes`.

New tables:

```jsonc
// caption_deck — the shared pool of funny text cards
{
  "id": "uuid",
  "text": "string",                 // e.g. "Said it, done it, posting it."
  "category": "string",             // "reaction" | "pov" | "dank" | "local" | "custom"
  "source_room": "uuid | null",     // non-null => created by a room's custom deck
  "created_at": "timestamp"
}

// hand_cards — one row per caption card in a player's hand
{
  "id": "uuid",
  "room_code": "string",            // FK -> rooms
  "player_id": "string",
  "caption_id": "uuid | null",      // null if a custom ad-hoc caption (free-type round)
  "text": "string",                 // denormalized copy so deck edits don't break hands
  "played": "bool default false",   // true once submitted this round
  "round_played": "int | null",
  "created_at": "timestamp",
  "UNIQUE": "(room_code, player_id, id)"
}

// round_captions — anonymized submissions per round
{
  "id": "uuid",                     // this id is what the judge selects
  "room_code": "string",
  "round_number": "int",
  "player_id": "string",            // kept server-side ONLY
  "caption_id": "uuid | null",
  "text": "string",
  "was_auto": "bool default false", // auto-played on timeout
  "created_at": "timestamp",
  "UNIQUE": "(room_code, round_number, player_id)"  // one caption per player per round
}

// rooms (extended) — new columns
{
  "status": "lobby | submitting | judging | round_end | ended",
  "judge_player_id": "string | null",     // current judge
  "current_image_url": "string | null",   // the image card on stage
  "current_image_width": "int | null",
  "current_image_height": "int | null",
  "caption_deck_id": "uuid | null",       // which deck is active
  "submit_seconds": "int default 45",
  "points_to_win": "int default 10",
  "hand_size": "int default 7"
}

// rounds (extended)
{
  "image_url": "string | null",     // which image card won/featured
  "judge_player_id": "string | null",
  "winner_caption_id": "uuid | null",
  "winner_player_id": "string | null",
  "auto_winner": "bool default false"
}
```

### Key RLS notes (party game, no auth)

- `hand_cards`: **read own rows only** (`player_id = current_anon_id`) so players
  can't see each other's hands; insert/update open (existing open policy style).
- `round_captions`: read only via a **server RPC** (`judge_view(round)`) that
  strips `player_id`; the Judge client never queries the raw table.

---

## 4. Virtual Enhancements

### 4.1 Static images + animated GIFs for prompt cards

- Reuse `SmartMeme` (`src/components/ui/meme-image.tsx`): renders at natural
  aspect ratio, caps height, never upscales → GIFs and stickers stay sane sized.
- Judge's picker = existing `MemePickerDrawer` (Vault / Giphy / Telegram /
  Upload tabs). Giphy results already carry `dims` so `SmartMeme` gets exact
  `width`/`height` (no layout jump).
- GIFs render via `unoptimized` `<img>`; stage uses `SmartMeme` like `/display`.

### 4.2 Player-created custom caption decks

- "Make a deck" screen: add caption lines (bulk paste, one per line), name it,
  save → rows in `caption_deck` with `source_room` = current room.
- Host activates a deck in `rooms.caption_deck_id`. Active deck = base `PROMPTS`
  + custom rows for that room.
- Custom decks become sharable: `deck_code` (short id) lets another room
  duplicate it.

### 4.3 Free-type bonus round (optional)

- Every ~5 rounds, a "type your own caption" round: submitters type a caption
  instead of playing a hand card (rows with `caption_id: null`). Adds chaos.

---

## 5. Implementation Roadmap (into the existing codebase)

1. **Schema** — add `caption_deck`, `hand_cards`, `round_captions`; extend
   `rooms` + `rounds` (migration in `supabase/schema.sql`).
2. **Lib** — `src/lib/captions.ts`: `drawHand(playerId, room)`,
   `fisherYatesShuffle()`, `anonymizeAndBroadcast(round)`, `applyJudgePick()`.
3. **Hook** — extend `useRoom` with new events + `round_captions` subscription.
4. **Host screen** — judge picker, live caption count, reveal (anonymized,
   shuffled), judge pick, round_end scoring + twist.
5. **Player screen** — hand rail (7 caption cards), play-card flow, "waiting for
   judge", win confetti.
6. **UI** — caption cards styled like the existing tape-sticker `card-sticker`
   utility; image stage via `SmartMeme`.

Rough effort: schema 1h, lib 2–3h, host UI 3–4h, player UI 3–4h, integration +
testing 2h.

---

## 6. Implementation Status

Shipped (mode toggle — the existing vote game is untouched and selectable):

- `rooms.mode` (`vote` | `meme_me`); host picks the mode in the lobby.
- Schema: `caption_deck`, `hand_cards`, `round_captions` + extended `rooms`/`rounds`
  (idempotent migration in `supabase/schema.sql`, safe to re-run).
- `src/lib/captions.ts`: `CAPTION_DECK`, `fisherYatesShuffle`, `dealHands`,
  `playCaption`, `anonymizeCaptions`, `nextJudge`, `resolveCaptionWinner`.
- `useRoom` handles `judge_pick_image`, `draw_hand`, `card_played`,
  `reveal_captions`, `judge_pick`, `round_end`, `judge_skip`, `mode_change`.
- Host screen: judge chip, image-card picker (host can override), live caption
  count, anonymized reveal, tap-to-crown fallback, skip-judge, next round.
- Player screen: judge picks image + caption from their phone; submitters play
  from a 7-card hand (changeable until reveal); winner/confetti states.
- State machine: `lobby → submitting → judging → round_end → submitting … → ended`
  (the judge picks the image during `submitting`, matching the 5-state design).

Not yet implemented (follow-ups):
- `submit_seconds` auto-play timeout + judge auto-pick (host currently clicks
  Reveal / taps a caption manually).
- `caption_deck` custom decks (`source_room`) + deck activation — the built-in
  `CAPTION_DECK` is used today.
- Free-type bonus round (`caption_id` null).
- Judge-disconnect auto-reassign (a manual **Skip judge** button exists).

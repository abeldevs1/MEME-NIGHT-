# Meme Night — Supabase Setup Guide

Step-by-step guide to connect the app to Supabase and Giphy. ~10 minutes total.

---

## 0. What's built

| Route | What it is |
|---|---|
| `/` | Home — create or join a room |
| `/room/[code]` | Host / TV display — runs the game loop |
| `/room/[code]/play` | Player phone view — pick memes, submit, full-screen pass-around |
| `/display` | Standalone meme displayer — pick a meme, show it fullscreen, no rooms |
| `/fullscreen?url=...` | Standalone full-screen meme view |
| `/admin/ingest` | Bulk-upload images to the meme vault |
| `/api/stickers?pack=...` | Fetch a Telegram sticker pack by link (server-side) |

The game uses Supabase for **data** (rooms, submissions, leaderboard), **storage**
(the `meme-vault` bucket) and **realtime** (broadcast + presence + DB change streams).
Giphy provides GIF search.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name (e.g. `meme-night`), a strong password, and a region close to your players.
3. Wait for the project to spin up (~1 min).

---

## 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. **Paste the entire contents of `supabase/schema.sql`** from this repo, or paste the
   code in section **2b** below.
3. Click **Run**. You should see "Success. No rows returned".

This creates:
- `memes` — the vault of uploaded/ingested images
- `rooms` — one row per game room (status, mode, current prompt/image, round, judge)
- `submissions` — one meme per player per round (vote mode)
- `players` — who joined each room
- `leaderboard` — points per player per room
- `rounds` — history of prompts/images + winners
- `votes` — who voted for whom each round (vote mode)
- `caption_deck` — the pool of caption cards (Meme Me mode)
- `hand_cards` — each player's 7-card caption hand (Meme Me mode)
- `round_captions` — the anonymous caption submissions per round (Meme Me mode)
- `room_messages` — the live room chat feed (text, meme, and system bubbles)
- `prompt_queue` — player-suggested prompts waiting for their turn
- `community_prompts` — user-saved prompts that join the shared deck
- the public storage bucket **`meme-vault`**
- RLS policies (open read/write — it's a party game with no auth)
- the realtime publication (needed for live updates)

### 2b. Migration for existing installs

The canonical, always-current script is **`supabase/schema.sql`** — paste the whole
file. It's idempotent: re-running it on an existing database only adds the new Meme Me
columns/tables and extends the `rooms.status` check to include `judging`/`round_end`
plus the new `rooms.mode` column (`vote` | `meme_me`). No existing data is touched.

> **If you ran an older version of the schema**, re-run the **whole** current
> `schema.sql` now — the whole file is safe to run again (all `if not exists`,
> including the realtime publication). After it runs, confirm the tables
> `caption_deck`, `hand_cards`, `round_captions`, and `votes` all exist (Supabase
> → Table Editor). Meme Me shows a clear error until they do.

Meme Me additions (already in `schema.sql`):
- `rooms.mode` — `vote` (default) or `meme_me`
- `rooms.judge_player_id`, `current_image_url`, `current_image_width/height`,
  `caption_deck_id`, `submit_seconds`, `points_to_win`, `hand_size`
- `rooms.status` extended with `judging` and `round_end`
- `rounds.image_url`, `rounds.judge_player_id`, `rounds.winner_caption_id`,
  `rounds.auto_winner`
- tables `caption_deck`, `hand_cards`, `round_captions` + their RLS policies,
  indexes, and realtime publication entries

Chat / prompt-queue / adult-deck additions (also in `schema.sql`):
- `rooms.prompt_category` (default `mixed`), `rooms.allow_adult` (default false),
  `rooms.prompt_author` (who set the current prompt)
- tables `room_messages` (the live chat feed) and `prompt_queue` + their RLS
  policies, indexes, and realtime publication entries
- Re-running the whole `schema.sql` applies all of the above.

Shared-deck / prompt-themes additions (also in `schema.sql`):
- the `community_prompts` table: anyone can save a prompt to the shared deck from
  the host prompt settings or the player "save to deck" card. Rows carry the
  prompt text, a `category` (the 17 themes below), an `adult` flag, and the
  author's name. Its RLS policies, index, and realtime entry are included.
- The prompt deck is now theme-based with 17 categories — **General, Fun,
  Reaction, POV, Outrageous, Caption this, How it feels, Group chat, Local
  flavour, Work, Food, Tech, Gaming, Horror, Travel**, plus gated **Spicy** and
  **Adult** (locked until "Include adult prompts" is on).
- Prompts are picked **without repeats within a room** (past rounds are excluded)
  and blend curated + freshly generated + community-saved prompts so the deck
  never runs dry.
- Re-running the whole `schema.sql` applies all of the above.

### 2c. The SQL (abbreviated; `schema.sql` wins)

```sql
create extension if not exists "pgcrypto";

create table if not exists public.memes (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  tags text[] default '{}',
  category text default 'general',
  created_at timestamp with time zone default now()
);

create table if not exists public.rooms (
  code text primary key,
  host_id text not null,
  host_name text default 'Host',
  status text default 'lobby'
    check (status in ('lobby', 'submitting', 'revealing', 'ended')),
  current_prompt text,
  round_number integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  meme_url text not null,
  meme_tag text,
  created_at timestamp with time zone default now(),
  unique (room_code, player_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  created_at timestamp with time zone default now(),
  unique (room_code, player_id)
);

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  points integer default 0,
  updated_at timestamp with time zone default now(),
  unique (room_code, player_id)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  round_number integer default 0,
  prompt text,
  winner_player_id text,
  winner_player_name text,
  winner_meme_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  round_number integer not null default 0,
  voter_player_id text not null,
  target_player_id text not null,
  meme_url text,
  created_at timestamp with time zone default now(),
  unique (room_code, round_number, voter_player_id)
);

create index if not exists memes_tags_idx on public.memes using gin (tags);
create index if not exists submissions_room_idx on public.submissions (room_code);
create index if not exists players_room_idx on public.players (room_code);
create index if not exists leaderboard_room_idx on public.leaderboard (room_code);
create index if not exists rounds_room_idx on public.rounds (room_code);
create index if not exists votes_room_idx on public.votes (room_code);

insert into storage.buckets (id, name, public)
values ('meme-vault', 'meme-vault', true)
on conflict (id) do nothing;

alter table public.memes enable row level security;
alter table public.rooms enable row level security;
alter table public.submissions enable row level security;
alter table public.players enable row level security;
alter table public.leaderboard enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'memes') then
    create policy "public read memes"      on public.memes      for select using (true);
    create policy "public insert memes"    on public.memes      for insert with check (true);
    create policy "public delete memes"    on public.memes      for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rooms') then
    create policy "public read rooms"      on public.rooms      for select using (true);
    create policy "public insert rooms"    on public.rooms      for insert with check (true);
    create policy "public update rooms"    on public.rooms      for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions') then
    create policy "public read submissions" on public.submissions for select using (true);
    create policy "public insert submissions" on public.submissions for insert with check (true);
    create policy "public update submissions" on public.submissions for update using (true) with check (true);
    create policy "public delete submissions" on public.submissions for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'players') then
    create policy "public read players"    on public.players    for select using (true);
    create policy "public insert players"  on public.players    for insert with check (true);
    create policy "public update players"  on public.players    for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leaderboard') then
    create policy "public read leaderboard" on public.leaderboard for select using (true);
    create policy "public upsert leaderboard" on public.leaderboard for insert with check (true);
    create policy "public update leaderboard" on public.leaderboard for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rounds') then
    create policy "public read rounds"     on public.rounds     for select using (true);
    create policy "public insert rounds"   on public.rounds     for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'votes') then
    create policy "public read votes"      on public.votes      for select using (true);
    create policy "public insert votes"    on public.votes      for insert with check (true);
    create policy "public update votes"    on public.votes      for update using (true) with check (true);
    create policy "public delete votes"    on public.votes      for delete using (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public read vault') then
    create policy "public read vault" on storage.objects for select using (bucket_id = 'meme-vault');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public write vault') then
    create policy "public write vault" on storage.objects for insert with check (bucket_id = 'meme-vault');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public delete vault') then
    create policy "public delete vault" on storage.objects for delete using (bucket_id = 'meme-vault');
  end if;
end $$;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.leaderboard;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.votes;
```

> If you use the Supabase CLI instead of the dashboard, put this in `supabase/schema.sql`
> (already there) and run `supabase db push`.

---

## 3. Verify storage bucket

Open **Storage** in the dashboard → you should see a public bucket named **`meme-vault`**.
If it's missing, the SQL insert failed — create it manually with **Public** visibility and
the same name (lowercase, no spaces).

---

## 4. Verify Realtime

Open **Database → Realtime** → the tables `rooms`, `submissions`, `players`, `leaderboard`,
`rounds`, `votes`, `hand_cards`, `round_captions`, `room_messages`, `prompt_queue`,
`community_prompts` should be toggled on (the last SQL block adds them to the publication).
Realtime must be enabled for the live game loop to work.

---

## 5. Add your keys

1. In the dashboard go to **Project Settings → API**.
2. Copy **Project URL** and the **anon / public** key.
3. In the project root run:

```bash
cp .env.local.example .env.local
```

4. Fill in the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_GIPHY_API_KEY=
TELEGRAM_BOT_TOKEN=
```

The `anon` key is safe to expose in the browser — that's what makes the no-login
party flow work. Row Level Security still guards everything.

---

## 6. Add a Giphy API key (GIF search)

1. Go to [developers.giphy.com](https://developers.giphy.com/) → **Create an App**.
2. Grab the **API Key** for your app.
3. Copy it into `NEXT_PUBLIC_GIPHY_API_KEY` in `.env.local`.
4. Restart the dev server after changing `.env.local`.

A key is already placed in `.env.local` for you — replace it with your own if you'd
rather use one tied to your Giphy account.

Giphy is optional — the vault still works without it. Without a key, the **Search**
tab in the meme picker shows a "not connected" message.

---

## 6b. Telegram stickers (paste a pack link)

The meme picker (and the `/display` tray) has a **Telegram** tab: paste a pack link
like `https://t.me/addstickers/pack_name`, and it lists every sticker with one-tap
"add to vault" / "use it".

This uses the Telegram **Bot API**, so you need a bot token (kept server-side only):

1. Open [@BotFather](https://t.me/BotFather) → **/newbot** → follow the prompts.
2. Copy the **bot token** (a `123456:ABC...` string).
3. Put it in `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-your-token
```

4. Restart the dev server. **No webhook or hosting is required** — the app just
   calls `getStickerSet` / `getFile` on the Bot API and proxies the image files
   through `/api/stickers/proxy` so the token never reaches the browser.

Bot must be able to access the pack: public packs work for any bot token.
Without the token, the Telegram tab shows a clear setup hint instead of failing.

---

## 7. Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## 8. How to play

**Pick a mode (host, in the lobby)**
The host picks how the night is played:
- **Meme Battle** (vote mode) — the original: everyone answers a prompt with a meme,
  then the room votes.
- **Meme Me** — What Do You Meme?: a rotating **Judge** picks an image card,
  everyone else plays a **caption card from their hand**, and the judge crowns the
  funniest pairing. Needs at least 2 players.

**In-person (party mode)**
1. Host opens `/` on the TV/laptop → **Create Room** → sets a name.
2. Everyone joins with the 4-letter code on their phones (`/` → code box, or the
   shared join link on the host screen).
3. Host picks **Meme Battle** or **Meme Me** in the lobby, then hits **Start the night**.

**Meme Battle (vote mode)**
1. A prompt appears on all screens. Keep an eye out for **twists** (Double Trouble =
   double points, etc.).
2. Players tap **Pick a Meme** → search the vault, Giphy, upload one, or pull in a
   Telegram sticker pack → it's submitted. Every submission pops into the **room
   chat** as a live meme bubble and the "Live memes" feed on every screen — no
   reveal needed to enjoy them.
3. Host hits **Reveal the memes** — memes pop up on the TV in a smart masonry layout
   and voting begins.
4. **Players vote** by tapping the best meme on their phone (the host sees live
   "🔥 Hot" counters), or the host can crown a winner directly. Winner gets points,
   leaderboard updates → **Next prompt**.
5. For a belly-laugh moment, a player taps **Full screen** on their phone and passes
   their device around.

**Prompt deck, queue & chat (vote mode, host lobby)**
- The host picks a **prompt deck** theme (General, Fun, Reaction, POV, Outrageous,
  Group chat, Local flavour, Work, Food, Tech, Gaming, Horror, Travel, Spicy, …)
  and can toggle **"Include adult prompts"** (off by default). Spicy/adult decks
  stay locked until that's on.
- Prompts never repeat within a room, and the deck blends curated, freshly
  generated, and community-saved prompts so the night always feels new.
- Anyone can **save a prompt to the shared deck** (host: prompt settings panel;
  players: the "Call the next prompt" card) — it joins the pool for any room.
- Players can **queue themselves** to call the next prompt ("Call the next prompt").
  The oldest queued turn is used automatically when the host starts the next round;
  the prompt card shows "Asked by @Name".
- **Room chat** is always on: text bubbles from the players' phones, live meme
  bubbles as they're submitted, and system notes (judge picks, queued prompts,
  round winners).

**Meme Me (judge + captions)**
1. **Judge** (shown on everyone's screen, rotates each round) picks an **image card**
   from the vault/Giphy/Telegram — from their phone, or the host can do it on the TV.
2. Everyone else gets a **hand of 7 caption cards**. Tap the funniest caption for the
   image to play it. You can change your pick until the reveal.
3. Host hits **Reveal the captions** — the captions appear **anonymized and shuffled**
   on all screens (nobody knows whose is whose).
4. The **Judge taps the funniest caption** (or the host crowns one as a fallback).
   Winner gets +1, the judge gets +1 for taste. Double Trouble/Golden Round = 2×.
5. **Next round** deals fresh hands and rotates the judge.

**Virtual room**
Same flow, minus the passing of phones. Everyone plays from anywhere.

---

## 9. Filling the vault (`/admin/ingest`)

- Open `/admin/ingest`, drag & drop images, pick a category and tags, and they're
  instantly in the game's meme picker.
- **Delete mistakes:** hover a vault meme and tap the trash icon (tap twice to
  confirm) — it removes the image from storage and the `memes` table.
- **Telegram stickers:** easiest way is the **Telegram** tab in the meme picker —
  paste a pack link and import the whole pack (see 6b). You can also export a
  sticker pack as WebP/PNG and drop the files in. Animated `.tgs` files aren't
  supported — grab the static WebP versions.

---

## 9b. The meme displayer (`/display`)

A no-rooms mode for passing one phone around the room:

- Open `/display` on a laptop/TV: a big black stage fills the screen.
- Pick a meme from the vault or Giphy search in the tray at the bottom.
- **Shuffle / Surprise me** cycles the vault at random; **← →** step through what's
  been shown; **Fullscreen** goes borderless.
- Tap **Surprise me** to keep the crowd guessing — the stage pops a random meme
  from the vault on every tap.

---

## 10. Hardening (optional)

The default RLS is intentionally wide open so anyone can create a room without
signing in. If you're going to a real audience you can lock inserts down:

- Add a shared "admin key" (e.g. a `X-Admin-Key` header checked in a Postgres
  function or via a Supabase Edge Function) and replace `with check (true)` on the
  `memes` / `rooms` insert policies with that check.
- Change the storage `public write vault` policy the same way.
- Rate-limit room creation (e.g. a trigger that prevents more than ~30 rooms/day/IP).

For local dev that extra work isn't needed.

-- ============================================================
-- MEME NIGHT — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Works with the default `postgres` / `public` schema.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. MEME VAULT — uploaded / ingested meme images
-- ------------------------------------------------------------
create table if not exists public.memes (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  tags text[] default '{}',
  category text default 'general', -- 'local', 'global', 'stickers', 'general'
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 2. GAME ROOMS
-- ------------------------------------------------------------
create table if not exists public.rooms (
  code text primary key,
  host_id text not null,
  host_name text default 'Host',
  status text default 'lobby'
    constraint rooms_status_check
    check (status in ('lobby', 'submitting', 'revealing', 'judging', 'round_end', 'ended')),
  mode text default 'vote'
    constraint rooms_mode_check
    check (mode in ('vote', 'meme_me')),
  current_prompt text,
  round_number integer default 0,
  judge_player_id text,
  current_image_url text,
  current_image_width integer,
  current_image_height integer,
  caption_deck_id uuid,
  submit_seconds integer default 45,
  points_to_win integer default 10,
  hand_size integer default 7,
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 3. SUBMISSIONS — one per player per round
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. PLAYER ROSTER — people who joined the room
-- ------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  created_at timestamp with time zone default now(),
  unique (room_code, player_id)
);

-- ------------------------------------------------------------
-- 5. LEADERBOARD — points per player per room
-- ------------------------------------------------------------
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  points integer default 0,
  updated_at timestamp with time zone default now(),
  unique (room_code, player_id)
);

-- ------------------------------------------------------------
-- 6. ROUNDS — history of prompts + winners (who won what)
-- ------------------------------------------------------------
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  round_number integer default 0,
  prompt text,
  image_url text,
  judge_player_id text,
  winner_caption_id uuid,
  winner_player_id text,
  winner_player_name text,
  winner_meme_url text,
  auto_winner boolean default false,
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 7b. CAPTION DECK — the shared pool of funny caption cards
-- (Meme Me mode). Seeded from the built-in deck; rooms can add
-- custom rows via `source_room`.
-- ------------------------------------------------------------
create table if not exists public.caption_deck (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text default 'general', -- 'reaction' | 'pov' | 'dank' | 'local' | 'custom'
  source_room text references public.rooms (code) on delete cascade,
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 7c. HAND CARDS — one row per caption card in a player's hand
-- (Meme Me mode).
-- ------------------------------------------------------------
create table if not exists public.hand_cards (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  caption_id uuid,
  text text not null,
  played boolean default false,
  round_played integer,
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 7d. ROUND CAPTIONS — anonymized caption submissions per round
-- (Meme Me mode). player_id is kept server-side only; the judge
-- view is the shuffled {id, text} broadcast, never this table.
-- ------------------------------------------------------------
create table if not exists public.round_captions (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  round_number integer not null default 0,
  player_id text not null,
  caption_id uuid,
  text text not null,
  was_auto boolean default false,
  created_at timestamp with time zone default now(),
  unique (room_code, round_number, player_id)
);

-- ------------------------------------------------------------
-- 7e. ROOM MESSAGES — the live group chat feed. Players send text
-- bubbles; meme submissions also post a 'meme' bubble so the whole
-- room sees them as they're sent (no reveal needed to view).
-- ------------------------------------------------------------
create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  sender_player_id text not null,
  sender_name text not null default 'Someone',
  kind text not null default 'text'
    constraint room_messages_kind_check
    check (kind in ('text', 'meme', 'system')),
  text text,
  meme_url text,
  meme_width integer,
  meme_height integer,
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 7f. PROMPT QUEUE — player-suggested prompts waiting for their
-- turn. When the host starts the next round, the oldest 'queued'
-- request is used automatically and marked 'used'.
-- ------------------------------------------------------------
create table if not exists public.prompt_queue (
  id uuid primary key default gen_random_uuid(),
  room_code text references public.rooms (code) on delete cascade,
  player_id text not null,
  player_name text not null,
  prompt text not null,
  status text not null default 'queued'
    constraint prompt_queue_status_check
    check (status in ('queued', 'used')),
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 7g. COMMUNITY PROMPTS — user-contributed prompts that join the
-- shared deck. Anyone can save one from the host prompt settings
-- or the player "save to deck" card; `category` mirrors the prompt
-- themes and `adult` tracks whether it needs the adult gate.
-- ------------------------------------------------------------
create table if not exists public.community_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  category text default 'general',
  adult boolean default false,
  author_name text,
  created_at timestamp with time zone default now()
);

-- ------------------------------------------------------------
-- 7. VOTES — players vote for the best meme during the reveal
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Migration — extend an existing install (idempotent, safe to re-run)
-- ------------------------------------------------------------
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('lobby', 'submitting', 'revealing', 'judging', 'round_end', 'ended'));
alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms add constraint rooms_mode_check
  check (mode in ('vote', 'meme_me'));

alter table public.rooms
  add column if not exists mode text default 'vote',
  add column if not exists judge_player_id text,
  add column if not exists current_image_url text,
  add column if not exists current_image_width integer,
  add column if not exists current_image_height integer,
  add column if not exists caption_deck_id uuid,
  add column if not exists submit_seconds integer default 45,
  add column if not exists points_to_win integer default 10,
  add column if not exists hand_size integer default 7,
  add column if not exists allow_adult boolean default false,
  add column if not exists prompt_category text default 'mixed',
  add column if not exists prompt_author text;

alter table public.rounds
  add column if not exists image_url text,
  add column if not exists judge_player_id text,
  add column if not exists winner_caption_id uuid,
  add column if not exists auto_winner boolean default false;

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists memes_tags_idx on public.memes using gin (tags);
create index if not exists submissions_room_idx on public.submissions (room_code);
create index if not exists players_room_idx on public.players (room_code);
create index if not exists leaderboard_room_idx on public.leaderboard (room_code);
create index if not exists rounds_room_idx on public.rounds (room_code);
create index if not exists votes_room_idx on public.votes (room_code);
create index if not exists hand_cards_room_idx on public.hand_cards (room_code, player_id);
create index if not exists round_captions_room_idx on public.round_captions (room_code, round_number);
create index if not exists caption_deck_source_idx on public.caption_deck (source_room);
create index if not exists room_messages_room_idx on public.room_messages (room_code, created_at);
create index if not exists prompt_queue_room_idx on public.prompt_queue (room_code, status, created_at);
create index if not exists community_prompts_category_idx on public.community_prompts (category);

-- ------------------------------------------------------------
-- Storage bucket for the meme vault
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('meme-vault', 'meme-vault', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Row Level Security
-- This is a party game with no auth: reads + writes are open.
-- For production you can lock inserts down by swapping
-- `with check (true)` for a role / admin-key check.
-- ------------------------------------------------------------
alter table public.memes enable row level security;
alter table public.rooms enable row level security;
alter table public.submissions enable row level security;
alter table public.players enable row level security;
alter table public.leaderboard enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.caption_deck enable row level security;
alter table public.hand_cards enable row level security;
alter table public.round_captions enable row level security;
alter table public.room_messages enable row level security;
alter table public.prompt_queue enable row level security;
alter table public.community_prompts enable row level security;

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
    create policy "public upsert leaderboard" on public.leaderboard
      for insert with check (true);
    create policy "public update leaderboard" on public.leaderboard
      for update using (true) with check (true);
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
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'caption_deck') then
    create policy "public read caption_deck"   on public.caption_deck   for select using (true);
    create policy "public insert caption_deck" on public.caption_deck   for insert with check (true);
    create policy "public delete caption_deck" on public.caption_deck   for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hand_cards') then
    create policy "public read hand_cards"   on public.hand_cards   for select using (true);
    create policy "public insert hand_cards" on public.hand_cards   for insert with check (true);
    create policy "public update hand_cards" on public.hand_cards   for update using (true) with check (true);
    create policy "public delete hand_cards" on public.hand_cards   for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'round_captions') then
    create policy "public read round_captions"   on public.round_captions   for select using (true);
    create policy "public insert round_captions" on public.round_captions   for insert with check (true);
    create policy "public update round_captions" on public.round_captions   for update using (true) with check (true);
    create policy "public delete round_captions" on public.round_captions   for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'room_messages') then
    create policy "public read room_messages"    on public.room_messages    for select using (true);
    create policy "public insert room_messages"  on public.room_messages    for insert with check (true);
    create policy "public update room_messages"  on public.room_messages    for update using (true) with check (true);
    create policy "public delete room_messages"  on public.room_messages    for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prompt_queue') then
    create policy "public read prompt_queue"   on public.prompt_queue   for select using (true);
    create policy "public insert prompt_queue" on public.prompt_queue   for insert with check (true);
    create policy "public update prompt_queue" on public.prompt_queue   for update using (true) with check (true);
    create policy "public delete prompt_queue" on public.prompt_queue   for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'community_prompts') then
    create policy "public read community_prompts"   on public.community_prompts   for select using (true);
    create policy "public insert community_prompts" on public.community_prompts   for insert with check (true);
    create policy "public update community_prompts" on public.community_prompts   for update using (true) with check (true);
    create policy "public delete community_prompts" on public.community_prompts   for delete using (true);
  end if;
end $$;

-- Storage object policies for the vault bucket
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

-- ------------------------------------------------------------
-- Realtime — stream room/submission/leaderboard changes
-- Idempotent: each table is only added if it isn't already a member,
-- so the whole script can be re-run safely.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions') then
    alter publication supabase_realtime add table public.submissions;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players') then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leaderboard') then
    alter publication supabase_realtime add table public.leaderboard;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rounds') then
    alter publication supabase_realtime add table public.rounds;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes') then
    alter publication supabase_realtime add table public.votes;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'caption_deck') then
    alter publication supabase_realtime add table public.caption_deck;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hand_cards') then
    alter publication supabase_realtime add table public.hand_cards;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'round_captions') then
    alter publication supabase_realtime add table public.round_captions;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_messages') then
    alter publication supabase_realtime add table public.room_messages;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prompt_queue') then
    alter publication supabase_realtime add table public.prompt_queue;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_prompts') then
    alter publication supabase_realtime add table public.community_prompts;
  end if;
end $$;

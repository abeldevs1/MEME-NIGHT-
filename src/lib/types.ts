export type RoomMode = "vote" | "meme_me";

export type RoomStatus = "lobby" | "submitting" | "revealing" | "judging" | "round_end" | "ended";

export type PromptCategory =
  | "mixed"
  | "general"
  | "funny"
  | "reaction"
  | "pov"
  | "outrageous"
  | "caption"
  | "feels"
  | "chat"
  | "local"
  | "work"
  | "food"
  | "tech"
  | "gaming"
  | "horror"
  | "travel"
  | "spicy"
  | "adult";

export interface Room {
  code: string;
  host_id: string;
  host_name: string;
  status: RoomStatus;
  mode: RoomMode;
  current_prompt: string | null;
  prompt_author: string | null;
  round_number: number;
  judge_player_id: string | null;
  current_image_url: string | null;
  current_image_width: number | null;
  current_image_height: number | null;
  submit_seconds: number | null;
  points_to_win: number | null;
  hand_size: number | null;
  prompt_category: PromptCategory | null;
  allow_adult: boolean | null;
  created_at: string;
}

export type MessageKind = "text" | "meme" | "system";

export interface RoomMessage {
  id: string;
  room_code: string;
  sender_player_id: string;
  sender_name: string;
  kind: MessageKind;
  text: string | null;
  meme_url: string | null;
  meme_width: number | null;
  meme_height: number | null;
  created_at: string;
}

export interface PromptRequest {
  id: string;
  room_code: string;
  player_id: string;
  player_name: string;
  prompt: string;
  status: "queued" | "used";
  created_at: string;
}

export interface Submission {
  id: string;
  room_code: string;
  player_id: string;
  player_name: string;
  meme_url: string;
  meme_tag: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_code: string;
  player_id: string;
  player_name: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  room_code: string;
  player_id: string;
  player_name: string;
  points: number;
  updated_at: string;
}

export interface Round {
  id: string;
  room_code: string;
  round_number: number;
  prompt: string | null;
  image_url: string | null;
  judge_player_id: string | null;
  winner_caption_id: string | null;
  winner_player_id: string | null;
  winner_player_name: string | null;
  winner_meme_url: string | null;
  auto_winner: boolean | null;
  created_at: string;
}

export interface CaptionCard {
  id: string;
  text: string;
  category: string;
  source_room: string | null;
  created_at: string;
}

export interface HandCard {
  id: string;
  room_code: string;
  player_id: string;
  caption_id: string | null;
  text: string;
  played: boolean;
  round_played: number | null;
  created_at: string;
}

export interface RoundCaption {
  id: string;
  room_code: string;
  round_number: number;
  player_id: string;
  caption_id: string | null;
  text: string;
  was_auto: boolean;
  created_at: string;
}

/** The judge-facing shape: no player_id, shuffled before broadcast. */
export interface AnonymousCaption {
  id: string;
  text: string;
}

export interface Vote {
  id: string;
  room_code: string;
  round_number: number;
  voter_player_id: string;
  target_player_id: string;
  meme_url: string | null;
  created_at: string;
}

export interface VaultMeme {
  id: string;
  url: string;
  tags: string[];
  category: string;
  created_at: string;
}

export type MemeSource =
  | { kind: "vault"; url: string; id: string; tag?: string; category?: string; width?: number; height?: number }
  | { kind: "giphy"; url: string; id: string; tag?: string; width?: number; height?: number }
  | { kind: "upload"; url: string; id?: string; tag?: string; width?: number; height?: number };

export interface GiphyMediaFormat {
  url: string;
  dims: [number, number];
  preview?: string;
  size: number;
}

export interface GiphyResult {
  id: string;
  title: string;
  url: string;
  gif: GiphyMediaFormat;
  tinygif: GiphyMediaFormat;
  webp: GiphyMediaFormat;
  preview: string;
}

export interface RevealItem {
  id: string;
  player_id: string;
  player_name: string;
  meme_url: string;
  meme_tag: string | null;
}

export interface Twist {
  title: string;
  emoji: string;
  text: string;
}

export interface RoundWinnerInfo {
  round: number;
  player_id: string;
  player_name: string;
  points: number;
  caption_id: string | null;
  auto: boolean;
}

export type BroadcastEvent =
  | { event: "phase"; payload: { status: RoomStatus; prompt: string | null; round: number; twist?: Twist | null; mode?: RoomMode } }
  | { event: "reveal"; payload: { submissions: RevealItem[] } }
  | { event: "winner"; payload: { player_id: string; player_name: string; meme_url: string; points: number } }
  | { event: "ended"; payload: Record<string, never> }
  | { event: "takeover"; payload: { host_id: string; host_name: string } }
  | { event: "host_left"; payload: Record<string, never> }
  | { event: "vote"; payload: { round: number; voter_player_id: string; target_player_id: string; meme_url: string | null } }
  // Meme Me events
  | { event: "mode_change"; payload: { mode: RoomMode } }
  | { event: "judge_pick_image"; payload: { round: number; image: { url: string; width?: number; height?: number }; judge_player_id: string; judge_name: string } }
  | { event: "draw_hand"; payload: { round: number; hand_size: number } }
  | { event: "card_played"; payload: { round: number; player_id: string; played_count: number; total: number } }
  | { event: "reveal_captions"; payload: { round: number; captions: AnonymousCaption[] } }
  | { event: "judge_pick"; payload: { round: number; caption_id: string } }
  | { event: "round_end"; payload: { round: number; winner: RoundWinnerInfo } }
  | { event: "judge_skip"; payload: { player_id: string; player_name: string } };

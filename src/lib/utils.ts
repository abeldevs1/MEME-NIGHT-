import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomRoomCode(length = 4) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

const PLAYER_ID_KEY = "meme-night.player-id";
const PLAYER_NAME_KEY = "meme-night.player-name";

/**
 * `crypto.randomUUID` only exists in secure contexts (localhost / HTTPS).
 * Over plain HTTP on a LAN it's missing, so fall back to a random id.
 */
export function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PLAYER_NAME_KEY) ?? "";
}

export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAYER_NAME_KEY, name);
}

export const NAMES = [
  "Alem",
  "Bini",
  "Chuchu",
  "Dawit",
  "Eyo",
  "Feven",
  "Girma",
  "Hana",
  "Imamu",
  "Jojo",
  "Kalkidan",
  "Liya",
  "Mahi",
  "Nati",
  "Oli",
  "Pumi",
  "Ruth",
  "Sami",
  "Tigist",
  "Uba",
  "Vava",
  "Winta",
  "Yoni",
  "Zala",
];

export function randomName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

export function formatPlayerCount(n: number) {
  return n === 1 ? "1 player" : `${n} players`;
}

export function isGifUrl(url: string) {
  return /\.gif($|\?)/i.test(url);
}

export function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)($|\?)/i.test(url);
}

/**
 * Turn a thrown value (postgrest errors, Error instances, plain objects)
 * into a readable message. `{}` objects from supabase get their `.message`
 * pulled out; anything else falls back to a generic string.
 */
export function errorMessage(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "object") {
    const rec = e as Record<string, unknown>;
    const msg = rec.message ?? rec.error_description ?? rec.hint;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

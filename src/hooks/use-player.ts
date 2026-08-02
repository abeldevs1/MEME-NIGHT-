"use client";

import { useState } from "react";
import { randomId } from "@/lib/utils";

const PLAYER_ID_KEY = "meme-night.player-id";
const PLAYER_NAME_KEY = "meme-night.player-name";

export function usePlayer() {
  const [playerId, setPlayerId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const existing = window.localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const fresh = randomId();
    window.localStorage.setItem(PLAYER_ID_KEY, fresh);
    return fresh;
  });

  const [name, setName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(PLAYER_NAME_KEY) ?? "";
  });

  const setPlayerName = (n: string) => {
    const clean = n.trim();
    if (typeof window !== "undefined") window.localStorage.setItem(PLAYER_NAME_KEY, clean);
    setName(clean);
  };

  return {
    playerId,
    name,
    hasName: Boolean(name),
    setPlayerName,
  };
}

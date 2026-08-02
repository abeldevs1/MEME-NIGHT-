"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";
import type {
  AnonymousCaption,
  HandCard,
  LeaderboardEntry,
  Player,
  PromptRequest,
  RevealItem,
  Room,
  RoomMessage,
  RoomMode,
  RoomStatus,
  Round,
  RoundCaption,
  RoundWinnerInfo,
  Submission,
  Twist,
  Vote,
} from "@/lib/types";

export interface PresenceMeta {
  player_id: string;
  player_name: string;
}

export interface RoomState {
  configured: boolean;
  loading: boolean;
  notFound: boolean;
  room: Room | null;
  submissions: Submission[];
  roster: Player[];
  online: Map<string, PresenceMeta>;
  leaderboard: LeaderboardEntry[];
  rounds: Round[];
  votes: Vote[];
  twist: Twist | null;
  revealSubmissions: RevealItem[] | null;
  handCards: HandCard[];
  roundCaptions: RoundCaption[];
  revealedCaptions: AnonymousCaption[] | null;
  judgePick: { round: number; caption_id: string } | null;
  roundWinner: RoundWinnerInfo | null;
  messages: RoomMessage[];
  promptQueue: PromptRequest[];
  schemaError: string | null;
  refresh: () => Promise<void>;
  send: (event: string, payload?: Record<string, unknown>) => void;
  trackPresence: (playerId: string, playerName: string) => void;
  untrackPresence: () => void;
  joinRoster: (playerId: string, playerName: string) => Promise<boolean>;
}

export function useRoom(code: string): RoomState {
  const configured = isSupabaseConfigured;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [online, setOnline] = useState<Map<string, PresenceMeta>>(new Map());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [twist, setTwist] = useState<Twist | null>(null);
  const [revealSubmissions, setRevealSubmissions] = useState<RevealItem[] | null>(null);
  const [handCards, setHandCards] = useState<HandCard[]>([]);
  const [roundCaptions, setRoundCaptions] = useState<RoundCaption[]>([]);
  const [revealedCaptions, setRevealedCaptions] = useState<AnonymousCaption[] | null>(null);
  const [judgePick, setJudgePick] = useState<{ round: number; caption_id: string } | null>(null);
  const [roundWinner, setRoundWinner] = useState<RoundWinnerInfo | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [promptQueue, setPromptQueue] = useState<PromptRequest[]>([]);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const promptRef = useRef<{ prompt: string | null; at: number } | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = requireSupabase();
    try {
      const r = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
      if (r.error) {
        const msg = r.error.message ?? "";
        setSchemaError(
          /does not exist|undefined_table/i.test(msg)
            ? 'The database is missing the "rooms" table. Open supabase/schema.sql in the Supabase SQL editor and run the whole file.'
            : `Couldn't load the room: ${errorMessage(r.error)}`,
        );
        setNotFound(true);
        return;
      }
      if (!r.data) {
        setNotFound(true);
        setRoom(null);
        return;
      }
      const others = await Promise.allSettled([
        supabase.from("submissions").select("*").eq("room_code", code),
        supabase.from("players").select("*").eq("room_code", code).order("created_at", { ascending: true }),
        supabase.from("leaderboard").select("*").eq("room_code", code).order("points", { ascending: false }),
        supabase
          .from("rounds")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("votes").select("*").eq("room_code", code),
        supabase.from("hand_cards").select("*").eq("room_code", code),
        supabase.from("round_captions").select("*").eq("room_code", code).order("created_at", { ascending: true }),
        supabase
          .from("room_messages")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })
          .limit(300),
        supabase
          .from("prompt_queue")
          .select("*")
          .eq("room_code", code)
          .eq("status", "queued")
          .order("created_at", { ascending: true }),
      ]);
      const missing: string[] = [];
      const rows = (i: number): unknown[] => {
        const res = others[i];
        if (res.status === "rejected") {
          const message = errorMessage(res.reason);
          if (/does not exist|relation "public\.[a-z_]+" does not exist|undefined_table/i.test(message)) {
            missing.push(message.match(/relation "public\.([a-z_]+)"/)?.[1] ?? "a table");
          }
          return [];
        }
        const err = res.value.error as { message?: string } | null;
        if (err && /does not exist|relation "public\.[a-z_]+" does not exist|undefined_table/i.test(err.message ?? "")) {
          missing.push(err.message?.match(/relation "public\.([a-z_]+)"/)?.[1] ?? "a table");
        }
        return (res.value.data ?? []) as unknown[];
      };
      if (missing.length > 0) {
        setSchemaError(
          `The database is missing ${[...new Set(missing)].join(", ")}. Open supabase/schema.sql in the Supabase SQL editor and run the whole file.`,
        );
      } else {
        setSchemaError(null);
      }
      const roomData = r.data as Room;
      setRoom((prev) => {
        if (!prev) return roomData;
        const recent = promptRef.current && Date.now() - promptRef.current.at < 3000;
        const prompt = recent ? promptRef.current!.prompt : roomData.current_prompt;
        return { ...roomData, current_prompt: prompt };
      });
      setSubmissions(rows(0) as Submission[]);
      setRoster(rows(1) as Player[]);
      setLeaderboard(rows(2) as LeaderboardEntry[]);
      setRounds(rows(3) as Round[]);
      setVotes(rows(4) as Vote[]);
      setHandCards(rows(5) as HandCard[]);
      const loadedRoundCaptions = rows(6) as RoundCaption[];
      setRoundCaptions(loadedRoundCaptions);
      if (roomData.status === "judging") {
        const real = loadedRoundCaptions.filter((r) => r.round_number === roomData.round_number && r.text !== "__SKIPPED__");
        const anon = [...real].map(c => ({ id: c.id, text: c.text }));
        // Host broadcast is the source of truth; this is a fallback for page reloads.
        setRevealedCaptions((prev) => prev ?? anon);
      }
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of rows(7) as RoomMessage[]) byId.set(m.id, m);
        return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
      setPromptQueue(rows(8) as PromptRequest[]);
    } catch (e) {
      setSchemaError(errorMessage(e, "Something went wrong refreshing the room."));
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => void refresh(), 150);
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = requireSupabase();

    void refresh();
    const poll = setInterval(() => void refresh(), 7000);

    const channel = supabase.channel(`room:${code}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "*" }, (msg) => {
        const payload = (msg.payload ?? {}) as Record<string, unknown>;
        switch (msg.event) {
          case "phase":
            promptRef.current = { prompt: (payload.prompt as string | null) ?? null, at: Date.now() };
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    status: payload.status as RoomStatus,
                    current_prompt: (payload.prompt as string | null) ?? null,
                    round_number: (payload.round as number) ?? prev.round_number,
                    mode: (payload.mode as RoomMode | undefined) ?? prev.mode,
                  }
                : prev,
            );
            setTwist((payload.twist as Twist | null) ?? null);
            setRevealedCaptions(null);
            setJudgePick(null);
            setRoundWinner(null);
            break;
          case "mode_change":
            setRoom((prev) => (prev ? { ...prev, mode: payload.mode as RoomMode } : prev));
            break;
          case "judge_pick_image": {
            const image = (payload.image ?? {}) as { url: string; width?: number; height?: number };
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    status: "submitting",
                    judge_player_id: (payload.judge_player_id as string) ?? prev.judge_player_id,
                    current_image_url: image.url ?? prev.current_image_url,
                    current_image_width: image.width ?? prev.current_image_width,
                    current_image_height: image.height ?? prev.current_image_height,
                  }
                : prev,
            );
            break;
          }
          case "draw_hand":
            void scheduleRefresh();
            break;
          case "card_played":
            void scheduleRefresh();
            break;
          case "reveal":
            setRevealSubmissions((payload.submissions as RevealItem[] | null) ?? []);
            setRoom((prev) => (prev ? { ...prev, status: "revealing" } : prev));
            break;
          case "winner":
            setRoom((prev) => (prev ? { ...prev, status: "revealing" } : prev));
            break;
          case "reveal_captions":
            setRevealedCaptions((payload.captions as AnonymousCaption[] | null) ?? []);
            setRoom((prev) => (prev ? { ...prev, status: "judging" } : prev));
            break;
          case "judge_pick":
            setJudgePick({ round: (payload.round as number) ?? 0, caption_id: payload.caption_id as string });
            break;
          case "round_end": {
            const info = payload.winner as RoundWinnerInfo | undefined;
            setRoundWinner(info ?? null);
            setJudgePick(null);
            setRoom((prev) => (prev ? { ...prev, status: "round_end" } : prev));
            break;
          }
          case "judge_skip":
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    judge_player_id: (payload.player_id as string) ?? prev.judge_player_id,
                  }
                : prev,
            );
            break;
          case "ended":
            setRoom((prev) => (prev ? { ...prev, status: "ended" } : prev));
            setTwist(null);
            setRevealedCaptions(null);
            setJudgePick(null);
            setRoundWinner(null);
            break;
          case "takeover":
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    host_id: payload.host_id as string,
                    host_name: (payload.host_name as string) ?? prev.host_name,
                  }
                : prev,
            );
            break;
          case "vote": {
            const round = (payload.round as number) ?? 0;
            const vote: Vote = {
              id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              room_code: code,
              round_number: round,
              voter_player_id: payload.voter_player_id as string,
              target_player_id: payload.target_player_id as string,
              meme_url: (payload.meme_url as string | null) ?? null,
              created_at: new Date().toISOString(),
            };
            setVotes((prev) => {
              const rest = prev.filter((v) => !(v.round_number === round && v.voter_player_id === vote.voter_player_id));
              return [...rest, vote];
            });
            break;
          }
          default:
            break;
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const map = new Map<string, PresenceMeta>();
        for (const key of Object.keys(state)) {
          const metas = state[key] as unknown as PresenceMeta[];
          for (const meta of metas) {
            if (meta?.player_id) map.set(meta.player_id, meta);
          }
        }
        setOnline(map);
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "submissions", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        (payload) => {
          const next = payload.new as Room;
          setRoom((prev) => {
            if (!prev) return next;
            const recent = promptRef.current && Date.now() - promptRef.current.at < 3000;
            const prompt = recent ? promptRef.current!.prompt : next.current_prompt;
            return { ...next, current_prompt: prompt };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hand_cards", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_captions", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_code=eq.${code}` },
        (payload) => {
          const m = payload.new as RoomMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prompt_queue", filter: `room_code=eq.${code}` },
        () => void scheduleRefresh(),
      );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // no-op, presence tracked by caller
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        console.warn(`[useRoom] realtime channel for ${code}: ${status} — poll will keep the room live.`);
      }
    });
    channelRef.current = channel;

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      clearInterval(poll);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, refresh, scheduleRefresh]);

  const send = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (!isSupabaseConfigured) return;
    channelRef.current?.send({ type: "broadcast", event, payload: payload ?? {} });
  }, []);

  const trackPresence = useCallback((playerId: string, playerName: string) => {
    if (!isSupabaseConfigured || !playerId) return;
    channelRef.current?.track({ player_id: playerId, player_name: playerName });
  }, []);

  const untrackPresence = useCallback(() => {
    if (!isSupabaseConfigured) return;
    void channelRef.current?.untrack();
  }, []);

  const joinRoster = useCallback(
    async (playerId: string, playerName: string) => {
      if (!isSupabaseConfigured || !playerId || !playerName) return false;
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("players")
        .upsert(
          { room_code: code, player_id: playerId, player_name: playerName },
          { onConflict: "room_code,player_id" },
        );
      if (error) {
        console.error("joinRoster failed", error);
        return false;
      }
      trackPresence(playerId, playerName);
      return true;
    },
    [code, trackPresence],
  );

  return {
    configured,
    loading,
    notFound,
    room,
    submissions,
    roster,
    online,
    leaderboard,
    rounds,
    votes,
    twist,
    revealSubmissions,
    handCards,
    roundCaptions,
    revealedCaptions,
    judgePick,
    roundWinner,
    messages,
    promptQueue,
    schemaError,
    refresh,
    send,
    trackPresence,
    untrackPresence,
    joinRoster,
  };
}

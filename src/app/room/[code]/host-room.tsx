"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Eye,
  Gavel,
  ImagePlus,
  ListOrdered,
  MessageSquareQuote,
  Play,
  RefreshCw,
  SkipForward,
  Sparkles,
  Square,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { CaptionCard } from "@/components/caption-card";
import { MemePickerDrawer } from "@/components/meme-picker-drawer";
import { NameModal } from "@/components/name-modal";
import { RoomChat } from "@/components/room-chat";
import { CopyButton, PhaseBadge, RoomCodeChip, ShareJoinLink } from "@/components/room/shared";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/ui/confetti";
import { MemeImage, SmartMeme } from "@/components/ui/meme-image";
import { usePlayer } from "@/hooks/use-player";
import { useRoom } from "@/hooks/use-room";
import { anonymizeCaptions, dealHands, nextJudge, playCaption, resolveCaptionWinner } from "@/lib/captions";
import { PROMPT_CATEGORIES, randomPrompt, randomTwist, saveCommunityPrompt } from "@/lib/prompts";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase/client";
import type {
  AnonymousCaption,
  HandCard,
  MemeSource,
  PromptCategory,
  PromptRequest,
  Room,
  RoomMode,
  Round,
  RoundCaption,
  RoundWinnerInfo,
  Submission,
  Twist,
} from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { MemePlayerSubmitView } from "./play/player-view";

interface HostRoomProps {
  code: string;
}

export function HostRoom({ code }: HostRoomProps) {
  const router = useRouter();
  const me = usePlayer();
  const roomState = useRoom(code);
  const {
    room,
    loading,
    notFound,
    configured,
    submissions,
    roster,
    leaderboard,
    rounds,
    votes,
    twist,
    handCards,
    roundCaptions,
    revealedCaptions,
    judgePick,
    roundWinner,
    messages,
    promptQueue,
    schemaError,
    send,
  } = roomState;
  const [customPrompt, setCustomPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvingRef = useRef(false);
  const autoRevealRef = useRef(false);

  const latestRound = rounds[0] ?? null;
  const winner =
    latestRound && latestRound.round_number === (room?.round_number ?? -1) && latestRound.winner_player_id
      ? latestRound
      : null;

  const roundVotes = votes.filter((v) => v.round_number === (room?.round_number ?? 0));
  const votesByPlayer = new Map<string, number>();
  for (const v of roundVotes) {
    votesByPlayer.set(v.target_player_id, (votesByPlayer.get(v.target_player_id) ?? 0) + 1);
  }

  const iAmHostJudge = Boolean(room && room.mode === "meme_me" && room.judge_player_id === me.playerId);
  const currentRoundCaptions = roundCaptions.filter((c) => c.round_number === room?.round_number);
  const myHostSubmission = submissions.find((s) => s.player_id === me.playerId) ?? null;
  const myHostHand = handCards.filter((h) => h.player_id === me.playerId && !h.played);
  const myHostPlayed =
    handCards.find((h) => h.player_id === me.playerId && h.played && h.round_played === room?.round_number) ?? null;

  const joinedRef = useRef(false);
  useEffect(() => {
    if (room && me.playerId && me.hasName && !joinedRef.current) {
      joinedRef.current = true;
      void roomState.joinRoster(me.playerId, me.name);
    }
    if (room && me.playerId && me.hasName) {
      roomState.trackPresence(me.playerId, me.name);
    }
  }, [room, me.playerId, me.hasName, me.name, roomState]);

  const isHost = room ? room.host_id === me.playerId : false;

  const updateRoom = useCallback(
    async (patch: Record<string, unknown>) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("rooms").update(patch).eq("code", code);
      if (error) throw error;
    },
    [code],
  );

  const postSystem = useCallback(
    async (text: string) => {
      const supabase = requireSupabase();
      await supabase.from("room_messages").insert({
        room_code: code,
        sender_player_id: "system",
        sender_name: "System",
        kind: "system",
        text,
      });
    },
    [code],
  );

  /** Auto-pull the oldest queued player prompt and mark it used (their turn). */
  const takeNextQueuedPrompt = useCallback(async (): Promise<{ prompt: string; author: string } | null> => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("prompt_queue")
      .select("*")
      .eq("room_code", code)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    await supabase.from("prompt_queue").update({ status: "used" }).eq("id", data.id);
    return { prompt: (data as PromptRequest).prompt, author: (data as PromptRequest).player_name };
  }, [code]);

  const [localCategory, setLocalCategory] = useState<PromptCategory | null>(null);
  const [localAllowAdult, setLocalAllowAdult] = useState<boolean | null>(null);
  const category = (localCategory ?? room?.prompt_category ?? "mixed") as PromptCategory;
  const allowAdult = localAllowAdult ?? room?.allow_adult ?? false;

  const startGame = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const queued = await takeNextQueuedPrompt();
      const prompt = customPrompt.trim() || queued?.prompt || randomPrompt({ category, allowAdult });
      const author = customPrompt.trim() ? null : (queued?.author ?? null);
      const round = room.round_number + 1;
      const nextTwist = randomTwist();
      await updateRoom({
        status: "submitting",
        current_prompt: prompt,
        prompt_author: author,
        round_number: round,
      });
      roomState.send("phase", { status: "submitting", prompt, round, twist: nextTwist });
      if (author) await postSystem(`🎤 ${author}'s turn — they set the prompt: "${prompt}"`);
    } catch (e) {
      setError(errorMessage(e, "Couldn't start the next round."));
    } finally {
      setBusy(false);
    }
  };

  const changeCategory = async (cat: PromptCategory) => {
    if (!room) return;
    setLocalCategory(cat); // optimistic — instant UI
    try {
      const gated = PROMPT_CATEGORIES.find((c) => c.key === cat)?.adult ?? false;
      const nextAdult = gated ? true : allowAdult;
      if (gated) setLocalAllowAdult(true);
      await updateRoom({ prompt_category: cat, allow_adult: nextAdult });
      setError(null);
    } catch (e) {
      setLocalCategory(null); // rollback
      setError(errorMessage(e, "Couldn't change the prompt deck."));
    }
  };

  const toggleAdult = async (v: boolean) => {
    if (!room) return;
    setLocalAllowAdult(v); // optimistic — instant UI
    try {
      await updateRoom({ allow_adult: v });
      setError(null);
    } catch (e) {
      setLocalAllowAdult(null); // rollback
      setError(errorMessage(e, "Couldn't toggle adult prompts."));
    }
  };

  const changeMode = async (mode: RoomMode) => {
    if (!room) return;
    setBusy(true);
    try {
      await updateRoom({ mode });
      roomState.send("mode_change", { mode });
    } finally {
      setBusy(false);
    }
  };

  const startMemeMe = async () => {
    if (!room || roster.length < 2) return;
    setBusy(true);
    try {
      const round = room.round_number + 1;
      const firstJudge = roster[0];
      await updateRoom({
        status: "submitting",
        round_number: round,
        judge_player_id: firstJudge?.player_id ?? null,
        current_image_url: null,
        current_image_width: null,
        current_image_height: null,
      });
      const ok = await dealHands(room, roster, room.hand_size ?? 7);
      if (!ok) {
        setError(
          "Couldn't deal caption hands. Make sure the supabase/schema.sql migration has been run (the hand_cards and round_captions tables are missing).",
        );
        return;
      }
      setError(null);
      roomState.send("phase", { status: "submitting", prompt: null, round, twist: randomTwist(), mode: "meme_me" });
      roomState.send("draw_hand", { round, hand_size: room.hand_size ?? 7 });
    } catch (e) {
      setError(errorMessage(e, "Couldn't start Meme Me."));
    } finally {
      setBusy(false);
    }
  };

  const pickImageForRound = async (meme: MemeSource) => {
    if (!room) return;
    setBusy(true);
    try {
      await updateRoom({
        current_image_url: meme.url,
        current_image_width: meme.width ?? null,
        current_image_height: meme.height ?? null,
      });
      roomState.send("judge_pick_image", {
        round: room.round_number,
        image: { url: meme.url, width: meme.width, height: meme.height },
        judge_player_id: (room.judge_player_id as string | null) ?? me.playerId,
        judge_name: me.name || "The judge",
      });
    } finally {
      setBusy(false);
    }
  };

  const revealCaptions = useCallback(async () => {
    if (!room) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { data } = await supabase
        .from("round_captions")
        .select("*")
        .eq("room_code", code)
        .eq("round_number", room.round_number);
      // Filter out skipped-round sentinel entries before revealing to the judge
      const real = ((data ?? []) as RoundCaption[]).filter((r) => r.text !== "__SKIPPED__");
      const anon = anonymizeCaptions(real);
      await updateRoom({ status: "judging" });
      roomState.send("reveal_captions", { round: room.round_number, captions: anon });
    } catch (e) {
      setError(errorMessage(e, "Couldn't reveal the captions."));
    } finally {
      setBusy(false);
    }
  }, [room, code, updateRoom, roomState]);

  const resolveRound = useCallback(
    async (captionId: string) => {
      if (!room || resolvingRef.current) return;
      resolvingRef.current = true;
      setBusy(true);
      try {
        const multiplier = twist?.title === "Double Trouble" || twist?.title === "Golden Round" ? 2 : 1;
        const res = await resolveCaptionWinner(room, captionId, multiplier);
        if (!res) return;
        const supabase = requireSupabase();
        const judgeId = room.judge_player_id ?? "";
        const { data: judgeRow } = await supabase
          .from("leaderboard")
          .select("*")
          .eq("room_code", code)
          .eq("player_id", judgeId)
          .maybeSingle();
        const judgeName = roster.find((p) => p.player_id === judgeId)?.player_name ?? "The judge";
        const judgePoints = (judgeRow?.points ?? 0) + 1;
        if (judgeId) {
          await supabase.from("leaderboard").upsert(
            {
              room_code: code,
              player_id: judgeId,
              player_name: judgeName,
              points: judgePoints,
            },
            { onConflict: "room_code,player_id" },
          );
        }
        const winnerPoints = res.points;
        await supabase.from("rounds").insert({
          room_code: code,
          round_number: room.round_number,
          prompt: null,
          image_url: room.current_image_url,
          judge_player_id: judgeId || null,
          winner_caption_id: captionId,
          winner_player_id: res.playerId,
          winner_player_name: res.playerName,
          winner_meme_url: null,
        });
        await updateRoom({ status: "round_end" });
        send("round_end", {
          round: room.round_number,
          winner: {
            round: room.round_number,
            player_id: res.playerId,
            player_name: res.playerName,
            points: winnerPoints,
            caption_id: captionId,
            auto: false,
          },
        });
        setBurst((b) => b + 1);
      } catch (e) {
        console.error("resolveRound failed", errorMessage(e));
      } finally {
        resolvingRef.current = false;
        setBusy(false);
      }
    },
    [room, code, roster, twist, updateRoom, send],
  );

  useEffect(() => {
    if (!isHost || !room) return;
    if (room.mode !== "meme_me" || room.status !== "judging" || resolvingRef.current) return;
    if (!judgePick || judgePick.round !== room.round_number) return;
    void resolveRound(judgePick.caption_id);
  }, [judgePick, isHost, room, resolveRound]);

  const skipJudge = async () => {
    if (!room) return;
    const next = nextJudge(roster, room.judge_player_id);
    if (!next) return;
    setBusy(true);
    try {
      await updateRoom({ judge_player_id: next.player_id });
      roomState.send("judge_skip", { player_id: next.player_id, player_name: next.player_name });
    } finally {
      setBusy(false);
    }
  };

  const nextRoundMemeMe = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const next = nextJudge(roster, room.judge_player_id);
      const round = room.round_number + 1;
      await updateRoom({
        status: "submitting",
        round_number: round,
        judge_player_id: next?.player_id ?? null,
        current_image_url: null,
        current_image_width: null,
        current_image_height: null,
      });
      const ok = await dealHands(room, roster, room.hand_size ?? 7);
      if (!ok) {
        setError(
          "Couldn't deal caption hands. Make sure the supabase/schema.sql migration has been run (the hand_cards and round_captions tables are missing).",
        );
        return;
      }
      setError(null);
      roomState.send("phase", { status: "submitting", prompt: null, round, twist: randomTwist(), mode: "meme_me" });
      roomState.send("draw_hand", { round, hand_size: room.hand_size ?? 7 });
      if (next) await postSystem(`👑 @${next.player_name} is the new judge — pick the meme card!`);
    } catch (e) {
      setError(errorMessage(e, "Couldn't start the next round."));
    } finally {
      setBusy(false);
    }
  };

  const reveal = useCallback(async () => {
    if (!room) return;
    setBusy(true);
    try {
      await updateRoom({ status: "revealing" });
      roomState.send("reveal", {
        submissions: submissions.map((s) => ({
          id: s.id,
          player_id: s.player_id,
          player_name: s.player_name,
          meme_url: s.meme_url,
          meme_tag: s.meme_tag,
        })),
      });
    } finally {
      setBusy(false);
    }
  }, [room, submissions, updateRoom, roomState]);

  const submitMemeHost = async (meme: MemeSource) => {
    if (!room) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      await supabase.from("submissions").delete().eq("room_code", code).eq("player_id", me.playerId);
      const { error } = await supabase.from("submissions").insert({
        room_code: code,
        player_id: me.playerId,
        player_name: me.name,
        meme_url: meme.url,
        meme_tag: meme.tag ?? null,
      });
      if (error) {
        setError(errorMessage(error, "Couldn't submit your meme."));
        return;
      }
      await supabase.from("room_messages").insert({
        room_code: code,
        sender_player_id: me.playerId,
        sender_name: me.name,
        kind: "meme",
        text: null,
        meme_url: meme.url,
        meme_width: meme.width ?? null,
        meme_height: meme.height ?? null,
      });
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  const playHostCard = async (card: HandCard) => {
    if (!room) return;
    setBusy(true);
    try {
      const ok = await playCaption(room, me.playerId, card);
      if (ok) {
        roomState.send("card_played", {
          round: room.round_number,
          player_id: me.playerId,
          played_count: currentRoundCaptions.length + 1,
          total: Math.max(1, roster.length - 1),
        });
        setError(null);
      } else {
        setError("Couldn't play that card. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const playHostCustom = async (text: string) => {
    if (!room || !text.trim()) return;
    setBusy(true);
    try {
      const { playCustomCaption } = await import("@/lib/captions");
      const ok = await playCustomCaption(room, me.playerId, text);
      if (ok) {
        roomState.send("card_played", {
          round: room.round_number,
          player_id: me.playerId,
          played_count: currentRoundCaptions.length + 1,
          total: Math.max(1, roster.length - 1),
        });
        setError(null);
      } else {
        setError("Couldn't play custom caption. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (room?.status !== "submitting") autoRevealRef.current = false;
  }, [room?.status]);

  useEffect(() => {
    if (!isHost || !room || room.status !== "submitting" || autoRevealRef.current) return;
    if (room.mode === "meme_me") {
      const total = Math.max(1, roster.length - 1);
      if (!room.current_image_url || currentRoundCaptions.length === 0 || currentRoundCaptions.length < total) return;
      autoRevealRef.current = true;
      void revealCaptions();
      return;
    }
    if (submissions.length === 0 || roster.length < 2) return;
    const allIn = roster.every((p) => submissions.some((s) => s.player_id === p.player_id));
    if (!allIn) return;
    let cancelled = false;
    void (async () => {
      const supabase = requireSupabase();
      const { count } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("room_code", code);
      if (cancelled || count == null || count < roster.length || autoRevealRef.current) return;
      autoRevealRef.current = true;
      void reveal();
    })();
    return () => {
      cancelled = true;
    };
  }, [isHost, room, roster, submissions, currentRoundCaptions, reveal, revealCaptions, code]);

  const pickWinner = async (sub: Submission) => {
    if (!room || winner) return;
    const supabase = requireSupabase();
    const entry = leaderboard.find((l) => l.player_id === sub.player_id);
    const multiplier = twist?.title === "Double Trouble" || twist?.title === "Golden Round" ? 2 : 1;
    const points = (entry?.points ?? 0) + 1 * multiplier;
    const { error: roundErr } = await supabase.from("rounds").insert({
      room_code: code,
      round_number: room.round_number,
      prompt: room.current_prompt,
      winner_player_id: sub.player_id,
      winner_player_name: sub.player_name,
      winner_meme_url: sub.meme_url,
    });
    if (roundErr) return;
    await supabase.from("leaderboard").upsert(
      {
        room_code: code,
        player_id: sub.player_id,
        player_name: sub.player_name,
        points,
      },
      { onConflict: "room_code,player_id" },
    );
    roomState.send("winner", {
      player_id: sub.player_id,
      player_name: sub.player_name,
      meme_url: sub.meme_url,
      points,
    });
    setBurst((b) => b + 1);
  };

  const nextRound = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      await supabase.from("submissions").delete().eq("room_code", code);
      await supabase.from("votes").delete().eq("room_code", code);
      const queued = await takeNextQueuedPrompt();
      const prompt = queued?.prompt ?? randomPrompt({ category, allowAdult });
      const author = queued?.author ?? null;
      const round = room.round_number + 1;
      const nextTwist = randomTwist();
      await updateRoom({
        status: "submitting",
        current_prompt: prompt,
        prompt_author: author,
        round_number: round,
      });
      roomState.send("phase", { status: "submitting", prompt, round, twist: nextTwist });
      if (author) await postSystem(`🎤 ${author}'s turn — they set the prompt: "${prompt}"`);
    } catch (e) {
      setError(errorMessage(e, "Couldn't start the next round."));
    } finally {
      setBusy(false);
    }
  };

  const endGame = async () => {
    setBusy(true);
    try {
      await updateRoom({ status: "ended" });
      roomState.send("ended", {});
    } finally {
      setBusy(false);
    }
  };

  const resetGame = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      await supabase.from("submissions").delete().eq("room_code", code);
      await supabase.from("players").delete().eq("room_code", code);
      await supabase.from("leaderboard").delete().eq("room_code", code);
      await supabase.from("rounds").delete().eq("room_code", code);
      await supabase.from("votes").delete().eq("room_code", code);
      await supabase.from("hand_cards").delete().eq("room_code", code);
      await supabase.from("round_captions").delete().eq("room_code", code);
      await updateRoom({
        status: "lobby",
        current_prompt: null,
        round_number: 0,
        judge_player_id: null,
        current_image_url: null,
        current_image_width: null,
        current_image_height: null,
      });
      roomState.send("phase", { status: "lobby", prompt: null, round: 0, twist: null });
    } finally {
      setBusy(false);
    }
  };

  const takeover = async () => {
    if (!room) return;
    await updateRoom({ host_id: me.playerId, host_name: me.name || "Host" });
    roomState.send("takeover", { host_id: me.playerId, host_name: me.name || "Host" });
  };

  const closeRoom = async () => {
    if (!room) return;
    if (!window.confirm("Close this room? All players will see the final screen.")) return;
    setBusy(true);
    try {
      await updateRoom({ status: "ended" });
      roomState.send("phase", { status: "ended", prompt: null, round: room.round_number, twist: null });
      router.push("/");
    } catch (e) {
      setError(errorMessage(e, "Couldn't close the room."));
    } finally {
      setBusy(false);
    }
  };

  if (!configured) return <ConfigScreen />;
  if (loading) return <LoadingScreen />;
  if (notFound || !room) return <NotFoundScreen code={code} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-safe pt-safe">
      <header className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between gap-3">
          <Brand size="sm" />
          <div className="flex items-center gap-2">
            <RoomCodeChip code={room.code} />
            <CopyButton text={room.code} />
            <PhaseBadge status={room.status} />
            {room.mode === "meme_me" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-dim px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                <MessageSquareQuote className="h-3 w-3" />
                Meme Me
              </span>
            )}
            {isHost && room.status !== "ended" && (
              <button
                onClick={closeRoom}
                className="ml-1 flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400 transition-colors hover:bg-red-500/20"
                title="Close room for everyone"
              >
                <XCircle className="h-3 w-3" />
                Close Room
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ShareJoinLink code={room.code} />
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            {roster.length} in the room
            <span className="text-zinc-700">·</span>
            round {room.round_number}
          </div>
        </div>
      </header>

      {!isHost ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <Crown className="h-10 w-10 text-zinc-600" />
          <div>
            <p className="text-lg font-bold text-zinc-100">You're not the host of this room</p>
            <p className="mt-1 text-sm text-zinc-500">
              {room.host_name || "The host"} is running the show. Grab the phone and play instead.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" variant="outline" onClick={() => router.push(`/room/${code}/play`)}>
              <Play className="h-4 w-4" />
              Open player view
            </Button>
            <Button size="sm" variant="ghost" onClick={takeover}>
              Take over as host
            </Button>
          </div>
        </div>
      ) : (
        <>
        <main className="grid flex-1 gap-6 py-4 lg:grid-cols-[1fr_290px]">
          <section className="flex flex-col gap-5">
            {schemaError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                <span className="flex-1">{schemaError}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <span className="flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="rounded-md px-1.5 text-red-300 hover:bg-red-500/20"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={room.status + (room.round_number)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5"
              >
                {room.status === "lobby" && (
                  <LobbyView
                    roster={roster}
                    mode={room.mode}
                    prompt={customPrompt}
                    onPromptChange={setCustomPrompt}
                    onStart={room.mode === "meme_me" ? startMemeMe : startGame}
                    onModeChange={changeMode}
                    category={category}
                    allowAdult={allowAdult}
                    onCategoryChange={changeCategory}
                    onAllowAdultChange={toggleAdult}
                    promptQueue={promptQueue}
                    busy={busy}
                  />
                )}
                {room.status === "submitting" &&
                  (room.mode === "meme_me" ? (
                    iAmHostJudge ? (
                      <MemeSubmittingView
                        room={room}
                        twist={twist}
                        judgeName={
                          roster.find((p) => p.player_id === room.judge_player_id)?.player_name ?? "The judge"
                        }
                        iAmJudge={true}
                        captionsIn={currentRoundCaptions}
                        roster={roster}
                        onPickImage={() => setPickerOpen(true)}
                        onReveal={revealCaptions}
                        onSkipJudge={skipJudge}
                        busy={busy}
                      />
                    ) : (
                      <>
                        <MemePlayerSubmitView
                          room={room}
                          iAmJudge={false}
                          myHand={myHostHand}
                          myPlayed={myHostPlayed}
                          playedCount={currentRoundCaptions.length}
                          totalSubmitters={Math.max(1, roster.length - 1)}
                          onPickImage={() => setPickerOpen(true)}
                          onPlay={playHostCard}
                          onPlayCustom={playHostCustom}
                          busy={busy}
                          error={error ?? ""}
                        />
                        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-2 pt-8">
                          <Button
                            size="xl"
                            block
                            onClick={() => void revealCaptions()}
                            loading={busy}
                            disabled={!room.current_image_url || currentRoundCaptions.length === 0}
                          >
                            <Eye className="h-5 w-5" />
                            Reveal the captions
                          </Button>
                        </div>
                      </>
                    )
                  ) : (
                    <SubmittingView
                      prompt={room.current_prompt}
                      promptAuthor={room.prompt_author}
                      twist={twist}
                      roster={roster}
                      submissions={submissions}
                      mySubmission={myHostSubmission}
                      onPick={() => setPickerOpen(true)}
                      onReveal={reveal}
                      busy={busy}
                    />
                  ))}
                {room.status === "revealing" && room.mode !== "meme_me" && (
                  <RevealView
                    prompt={room.current_prompt}
                    submissions={submissions}
                    votesByPlayer={votesByPlayer}
                    winner={winner}
                    onPick={pickWinner}
                    onNext={nextRound}
                    onEnd={endGame}
                    busy={busy}
                  />
                )}
                {room.status === "judging" && room.mode === "meme_me" && (
                  <MemeJudgingView
                    room={room}
                    captions={revealedCaptions ?? []}
                    judgeName={
                      roster.find((p) => p.player_id === room.judge_player_id)?.player_name ?? "The judge"
                    }
                    iAmJudge={room.judge_player_id === me.playerId}
                    onPick={resolveRound}
                    busy={busy}
                  />
                )}
                {room.status === "round_end" && room.mode === "meme_me" && (
                  <MemeRoundEndView
                    room={room}
                    winner={roundWinner}
                    latestRound={latestRound}
                    winningCaption={
                      (roundWinner?.caption_id ?? latestRound?.winner_caption_id ?? null)
                        ? roundCaptions.find(
                            (c) => c.id === (roundWinner?.caption_id ?? latestRound?.winner_caption_id),
                          )?.text ?? null
                        : null
                    }
                    onNext={nextRoundMemeMe}
                    onEnd={endGame}
                    busy={busy}
                  />
                )}
                {room.status === "ended" && (
                  <EndedView
                    leaderboard={leaderboard}
                    onReset={resetGame}
                    onPlayerView={() => router.push(`/room/${code}/play`)}
                    busy={busy}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <LeaderboardPanel entries={leaderboard} />
            <RoomChat
              code={code}
              mePlayerId={me.playerId}
              meName={me.name}
              messages={messages}
              maxHeight="max-h-64"
            />
            <PlayerPanel roster={roster} submissions={submissions} />
          </aside>
        </main>
        </>
      )}
      <MemePickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(meme) => {
          if (room?.mode === "meme_me") void pickImageForRound(meme);
          else void submitMemeHost(meme);
        }}
      />

      <ConfettiBurst burst={burst} />
      <NameModal
        open={!me.hasName && !loading}
        title="Host, what's your name?"
        subtitle="It shows on the leaderboard if you play."
        submitLabel="Save"
        initialValue={me.name}
        onSubmit={(n) => {
          me.setPlayerName(n);
          const id = me.playerId;
          if (room && id) {
            joinedRef.current = true;
            void roomState.joinRoster(id, n);
            roomState.trackPresence(id, n);
          }
        }}
      />
    </div>
  );
}

function LobbyView({
  roster,
  mode,
  prompt,
  onPromptChange,
  onStart,
  onModeChange,
  category,
  allowAdult,
  onCategoryChange,
  onAllowAdultChange,
  promptQueue,
  busy,
}: {
  roster: { player_id: string; player_name: string }[];
  mode: RoomMode;
  prompt: string;
  onPromptChange: (v: string) => void;
  onStart: () => void;
  onModeChange: (mode: RoomMode) => void;
  category: PromptCategory;
  allowAdult: boolean;
  onCategoryChange: (c: PromptCategory) => void;
  onAllowAdultChange: (v: boolean) => void;
  promptQueue: PromptRequest[];
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-edge bg-surface p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Lobby</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-50">Everyone ready?</h1>
        <p className="mt-2 text-sm text-zinc-400">Share the room code. When the crew's in, start the night.</p>

        <ModeSelector mode={mode} onModeChange={onModeChange} />

        {mode === "vote" && (
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Optional: write your own prompt, otherwise one gets picked for you"
            rows={2}
            className="mt-5 w-full resize-none rounded-2xl border border-edge bg-surface-2 p-4 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
          />
        )}

        {mode === "vote" && <PromptSettings category={category} allowAdult={allowAdult} onCategoryChange={onCategoryChange} onAllowAdultChange={onAllowAdultChange} />}

        {mode === "vote" && promptQueue.length > 0 && <PromptQueuePanel queue={promptQueue} />}

        {mode === "meme_me" && roster.length < 2 && (
          <p className="mt-4 text-center text-xs text-amber-300/90">
            Meme Me needs at least 2 players — the judge and one submitter.
          </p>
        )}

        <Button size="xl" block className="mt-4" onClick={onStart} loading={busy} disabled={mode === "meme_me" && roster.length < 2}>
          <Play className="h-5 w-5" />
          Start the night
        </Button>
      </div>
      <PlayerPanel roster={roster} submissions={[]} title="In the room" />
    </div>
  );
}

function PromptSettings({
  category,
  allowAdult,
  onCategoryChange,
  onAllowAdultChange,
}: {
  category: PromptCategory;
  allowAdult: boolean;
  onCategoryChange: (c: PromptCategory) => void;
  onAllowAdultChange: (v: boolean) => void;
}) {
  const [deckDraft, setDeckDraft] = useState("");
  const [deckStatus, setDeckStatus] = useState<string | null>(null);
  const [deckBusy, setDeckBusy] = useState(false);

  const savePromptToDeck = async () => {
    const text = deckDraft.trim();
    if (!text || deckBusy) return;
    setDeckBusy(true);
    setDeckStatus(null);
    try {
      await saveCommunityPrompt({ prompt: text, category, adult: allowAdult });
      setDeckDraft("");
      setDeckStatus("Saved to the deck — it can show up in any room.");
    } catch (e) {
      setDeckStatus(errorMessage(e, "Couldn't save that prompt."));
    } finally {
      setDeckBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-edge bg-surface-2/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-zinc-200">Prompt deck</p>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-300">
          <input
            type="checkbox"
            checked={allowAdult}
            onChange={(e) => onAllowAdultChange(e.target.checked)}
            className="h-4 w-4 rounded border-edge bg-surface-3 text-red-500 focus:ring-red-500/30 focus:ring-offset-0"
          />
          <span>Include adult prompts {allowAdult ? "🔞" : ""}</span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPT_CATEGORIES.map((c) => {
          const selected = category === c.key;
          const gated = c.adult && !allowAdult;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onCategoryChange(c.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-edge bg-surface-2 text-zinc-400 hover:border-accent/40 hover:text-zinc-200",
                gated && "opacity-50",
              )}
              title={gated ? "Turn on adult prompts to use this deck" : c.description}
            >
              {c.emoji}
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        {allowAdult
          ? "Spicy & adult decks are on the table. The room picked it, the room owns it."
          : "Playing it clean — spicy and adult decks stay locked."}
      </p>
      <div className="mt-3 border-t border-edge pt-3">
        <p className="text-xs font-semibold text-zinc-300">Save a prompt to the shared deck</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          It lands in the {PROMPT_CATEGORIES.find((c) => c.key === category)?.label ?? "general"} deck and can show up in any room.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={deckDraft}
            onChange={(e) => setDeckDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && deckDraft.trim() && !deckBusy && void savePromptToDeck()}
            placeholder="e.g. Describe this without naming it"
            maxLength={200}
            className="h-9 min-w-0 flex-1 rounded-full border border-edge bg-surface-2 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
          />
          <Button size="sm" onClick={() => void savePromptToDeck()} disabled={!deckDraft.trim() || deckBusy}>
            {deckBusy ? "Saving…" : "Save to deck"}
          </Button>
        </div>
        {deckStatus && <p className="mt-2 text-xs text-accent">{deckStatus}</p>}
      </div>
    </div>
  );
}

function PromptQueuePanel({ queue }: { queue: PromptRequest[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-edge bg-surface-2/60 p-4">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-accent" />
        <p className="text-sm font-bold text-zinc-200">Prompt queue</p>
        <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
          {queue.length} {queue.length === 1 ? "turn" : "turns"}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Players can queue themselves to pick the next prompt. The oldest turn gets used automatically when you start.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {queue.map((q, i) => (
          <li
            key={q.id}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2",
              i === 0 ? "border-accent/40 bg-accent/10" : "border-edge bg-surface-2",
            )}
          >
            {i === 0 ? (
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            ) : (
              <ListOrdered className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
            )}
            <div className="min-w-0">
              {i === 0 && <p className="text-[10px] font-bold uppercase tracking-wide text-accent">Next up</p>}
              <p className="text-sm text-zinc-200">{q.prompt}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Asked by @{q.player_name}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModeSelector({ mode, onModeChange }: { mode: RoomMode; onModeChange: (mode: RoomMode) => void }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onModeChange("vote")}
        className={cn(
          "flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors",
          mode === "vote" ? "border-violet-400/60 bg-violet-500/10" : "border-edge bg-surface-2 hover:border-violet-400/40",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Sparkles className="h-4 w-4 text-violet-300" />
          Meme Battle
        </span>
        <span className="text-xs leading-relaxed text-zinc-500">
          Everyone answers a prompt with a meme, then the room votes.
        </span>
        {mode === "vote" && (
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-300">Selected</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onModeChange("meme_me")}
        className={cn(
          "flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors",
          mode === "meme_me" ? "border-accent/60 bg-accent-dim" : "border-edge bg-surface-2 hover:border-accent/40",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <MessageSquareQuote className="h-4 w-4 text-accent" />
          Meme Me
        </span>
        <span className="text-xs leading-relaxed text-zinc-500">
          A rotating judge picks an image, everyone plays a caption card, the judge crowns the funniest.
        </span>
        {mode === "meme_me" && (
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-accent">Selected</span>
        )}
      </button>
    </div>
  );
}

function SubmittingView({
  prompt,
  promptAuthor,
  twist,
  roster,
  submissions,
  mySubmission,
  onPick,
  onReveal,
  busy,
}: {
  prompt: string | null;
  promptAuthor: string | null;
  twist: Twist | null;
  roster: { player_id: string; player_name: string }[];
  submissions: Submission[];
  mySubmission: { player_id: string; player_name: string; meme_url: string } | null;
  onPick: () => void;
  onReveal: () => void;
  busy: boolean;
}) {
  const submittedCount = submissions.length;
  const total = Math.max(1, roster.length);
  const allIn = total > 0 && submittedCount >= total;
  const pct = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-5">
      <TwistBanner twist={twist} />
      <div className="rounded-3xl border border-edge bg-surface p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Prompt</p>
        <p className="mt-3 font-display text-3xl font-extrabold leading-snug tracking-tight text-zinc-50 sm:text-4xl">
          {prompt}
        </p>
        {promptAuthor && (
          <p className="mt-2 text-xs font-semibold text-accent">Asked by @{promptAuthor}</p>
        )}
      </div>

      {!mySubmission ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-accent/50 bg-accent-dim px-4 py-3">
          <div>
            <p className="text-sm font-bold text-zinc-100">Your turn, host</p>
            <p className="text-xs text-zinc-400">Pick a meme to play this round.</p>
          </div>
          <Button size="md" onClick={onPick}>
            <ImagePlus className="h-4 w-4" />
            Pick a Meme
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-dim px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-edge bg-surface-2">
              <MemeImage src={mySubmission.meme_url} alt="" fit="contain" sizes="48px" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-100">Your meme is in</p>
              <p className="text-xs text-accent">
                {submittedCount} of {total} submitted
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onPick}>
            <RefreshCw className="h-4 w-4" />
            Change
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-edge bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-zinc-300">
            {submittedCount} of {total} submitted
          </p>
          <p className="text-xs font-bold text-accent">{pct}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      {submissions.length > 0 && (
        <div className="rounded-2xl border border-edge bg-surface p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-bold text-zinc-200">Live memes</p>
            <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
              Live
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden rounded-2xl border border-edge bg-surface-2"
              >
                <SmartMeme
                  src={sub.meme_url}
                  alt={`${sub.player_name}'s meme`}
                  maxHeight="max-h-[40vh]"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <p className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400">@{sub.player_name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <PlayerPanel roster={roster} submissions={submissions} title="Who's in" />

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-2 pt-8">
        {allIn && (
          <p className="mb-2 text-center text-xs font-semibold text-accent">
            Everyone's in — revealing automatically…
          </p>
        )}
        <Button size="xl" block onClick={onReveal} loading={busy} disabled={submittedCount === 0}>
          <Eye className="h-5 w-5" />
          Reveal the memes
        </Button>
      </div>
    </div>
  );
}

function TwistBanner({ twist }: { twist: Twist | null }) {
  if (!twist) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      className="relative mx-auto -rotate-1 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-center backdrop-blur-sm"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
        {twist.emoji} Twist · {twist.title}
      </p>
      <p className="mt-0.5 text-sm text-amber-100">{twist.text}</p>
    </motion.div>
  );
}

function RevealView({
  prompt,
  submissions,
  votesByPlayer,
  winner,
  onPick,
  onNext,
  onEnd,
  busy,
}: {
  prompt: string | null;
  submissions: Submission[];
  votesByPlayer: Map<string, number>;
  winner: { winner_player_name: string | null; winner_meme_url: string | null; winner_player_id?: string | null } | null;
  onPick: (s: Submission) => void;
  onNext: () => void;
  onEnd: () => void;
  busy: boolean;
}) {
  const maxVotes = Math.max(0, ...votesByPlayer.values());
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-xl font-bold text-zinc-100">{prompt}</p>
        <PhaseBadge status="revealing" />
      </div>

      {winner ? (
        <div className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-dim p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-zinc-950">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold text-accent">
              {winner.winner_player_name} takes it 👑
            </p>
            <p className="text-sm text-zinc-300">Point on the board. The room's laughing.</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-400">
          Tap a meme to crown the winner{maxVotes > 0 && " — or go with the room's votes"}.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {submissions.map((sub, i) => {
          const isWinner = winner?.winner_meme_url === sub.meme_url;
          const votes = votesByPlayer.get(sub.player_id) ?? 0;
          const leading = votes === maxVotes && votes > 0;
          return (
            <button
              key={sub.id}
              onClick={() => onPick(sub)}
              disabled={Boolean(winner)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border bg-surface-2 transition-all",
                isWinner
                  ? "border-accent ring-2 ring-accent"
                  : winner
                    ? "border-edge opacity-70"
                    : "border-edge hover:-translate-y-0.5 active:scale-[0.98]",
              )}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 26 }}
              >
                <SmartMeme src={sub.meme_url} alt="" maxHeight="max-h-[52vh]" sizes="(max-width: 768px) 50vw, 33vw" />
              </motion.div>
              <div className="absolute left-2 top-2 flex items-center gap-1.5">
                {leading && !winner && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-zinc-950 shadow-lg shadow-amber-400/30">
                    🔥 Hot
                  </span>
                )}
                {isWinner && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-zinc-950">
                    Winner 👑
                  </span>
                )}
              </div>
              {votes > 0 && !winner && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-zinc-950/80 px-2 py-0.5 text-xs font-bold text-accent backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  {votes}
                </span>
              )}
              {!winner && (
                <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                  <Crown className="h-7 w-7 text-accent" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {submissions.length === 0 && (
        <p className="text-center text-sm text-zinc-500">No memes were submitted this round.</p>
      )}

      <div className="flex gap-2">
        <Button size="lg" onClick={onNext} loading={busy}>
          <SkipForward className="h-4 w-4" />
          Next prompt
        </Button>
        <Button size="lg" variant="danger" onClick={onEnd}>
          <Square className="h-4 w-4" />
          End game
        </Button>
      </div>
    </div>
  );
}

function EndedView({
  leaderboard,
  onReset,
  onPlayerView,
  busy,
}: {
  leaderboard: { player_id: string; player_name: string; points: number }[];
  onReset: () => void;
  onPlayerView: () => void;
  busy: boolean;
}) {
  const top = leaderboard[0];
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-edge bg-surface p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-50">Night's over</h1>
        {top ? (
          <p className="mt-2 text-zinc-400">
            <span className="font-bold text-accent">{top.player_name}</span> took it with{" "}
            {top.points} {top.points === 1 ? "point" : "points"}
          </p>
        ) : (
          <p className="mt-2 text-zinc-500">Nobody scored. Run it back?</p>
        )}
      </div>
      <LeaderboardPanel entries={leaderboard} />
      <div className="flex flex-col gap-2">
        <Button size="xl" onClick={onReset} loading={busy}>
          <RefreshCw className="h-5 w-5" />
          New game
        </Button>
        <Button size="lg" variant="outline" onClick={onPlayerView}>
          Open player view
        </Button>
      </div>
    </div>
  );
}

function LeaderboardPanel({ entries }: { entries: { player_id: string; player_name: string; points: number }[] }) {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  return (
    <div className="rounded-2xl border border-edge bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Leaderboard</p>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No points yet. Crown a winner to start.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {sorted.map((entry, i) => (
            <li
              key={entry.player_id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                i === 0 ? "bg-accent-dim" : "bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "w-5 text-center text-sm font-extrabold",
                  i === 0 ? "text-accent" : "text-zinc-500",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-zinc-100">
                {entry.player_name}
              </span>
              <span className="rounded-full bg-zinc-950/40 px-2 py-0.5 text-xs font-bold text-accent">
                {entry.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function JudgeChip({ name, iAmJudge }: { name: string; iAmJudge: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border px-4 py-3",
        iAmJudge ? "border-amber-400/40 bg-amber-400/10" : "border-edge bg-surface",
      )}
    >
      <Gavel className="h-4 w-4 shrink-0 text-amber-300" />
      <p className="text-sm font-semibold text-zinc-200">
        Judge: <span className="text-amber-300">{name}</span>
        {iAmJudge && <span className="text-zinc-400"> · that's you</span>}
      </p>
    </div>
  );
}

function MemeSubmittingView({
  room,
  twist,
  judgeName,
  iAmJudge,
  captionsIn,
  roster,
  onPickImage,
  onReveal,
  onSkipJudge,
  busy,
}: {
  room: Room;
  twist: Twist | null;
  judgeName: string;
  iAmJudge: boolean;
  captionsIn: RoundCaption[];
  roster: { player_id: string; player_name: string }[];
  onPickImage: () => void;
  onReveal: () => void;
  onSkipJudge: () => void;
  busy: boolean;
}) {
  const hasImage = Boolean(room.current_image_url);
  const playedCount = captionsIn.length;
  const totalSubmitters = Math.max(1, roster.length - 1);
  const pct = Math.round((playedCount / totalSubmitters) * 100);
  const playedIds = new Set(captionsIn.map((c) => c.player_id));
  return (
    <div className="flex flex-col gap-5">
      <TwistBanner twist={twist} />
      <JudgeChip name={judgeName} iAmJudge={iAmJudge} />

      {!hasImage ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-edge-2 bg-surface p-8 text-center">
          <Gavel className="h-8 w-8 text-amber-300" />
          <div>
            <p className="text-lg font-bold text-zinc-100">Waiting on {judgeName}</p>
            <p className="mt-1 text-sm text-zinc-500">The judge needs to pick an image card to caption.</p>
          </div>
          <Button size="lg" onClick={onPickImage} loading={busy}>
            <ImagePlus className="h-4 w-4" />
            Pick the image card
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-edge bg-surface p-3">
            <SmartMeme
              src={room.current_image_url!}
              alt=""
              maxHeight="max-h-[55vh]"
              width={room.current_image_width ?? undefined}
              height={room.current_image_height ?? undefined}
              sizes="100vw"
            />
          </div>

          <div className="rounded-2xl border border-edge bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-zinc-300">
                {playedCount} of {totalSubmitters} captions in
              </p>
              <p className="text-xs font-bold text-accent">{pct}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
            </div>
          </div>

          <Button size="md" variant="ghost" onClick={onPickImage} disabled={!iAmJudge && !room.current_image_url}>
            <ImagePlus className="h-4 w-4" />
            Change the image card
          </Button>
        </>
      )}

      <PlayerPanel roster={roster} submissions={[]} playedIds={playedIds} title="Who's in" />

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-2 pt-8">
        {hasImage && totalSubmitters > 0 && playedCount >= totalSubmitters && (
          <p className="mb-1 text-center text-xs font-semibold text-accent">
            Everyone's in — revealing automatically…
          </p>
        )}
        <Button size="xl" block onClick={onReveal} loading={busy} disabled={!hasImage || playedCount === 0}>
          <Eye className="h-5 w-5" />
          Reveal the captions
        </Button>
        <div className="flex justify-center">
          <Button size="sm" variant="ghost" onClick={onSkipJudge}>
            <SkipForward className="h-3.5 w-3.5" />
            Skip judge
          </Button>
        </div>
      </div>
    </div>
  );
}

function MemeJudgingView({
  room,
  captions,
  judgeName,
  iAmJudge,
  onPick,
  busy,
}: {
  room: Room;
  captions: AnonymousCaption[];
  judgeName: string;
  iAmJudge: boolean;
  onPick: (captionId: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <JudgeChip name={judgeName} iAmJudge={iAmJudge} />

      {room.current_image_url && (
        <div className="rounded-3xl border border-edge bg-surface p-3">
          <SmartMeme
            src={room.current_image_url}
            alt=""
            maxHeight="max-h-[45vh]"
            width={room.current_image_width ?? undefined}
            height={room.current_image_height ?? undefined}
            sizes="100vw"
          />
        </div>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-edge bg-surface px-4 py-3">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
        <p className="text-sm text-zinc-300">
          {captions.length === 0
            ? "No captions this round."
            : iAmJudge
              ? "You're the judge — tap the funniest caption."
              : `Waiting on ${judgeName} to crown a winner…`}
        </p>
      </div>

      {captions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {captions.map((c, i) => (
            <div key={c.id}>
              <CaptionCard
                text={c.text}
                onClick={() => onPick(c.id)}
                disabled={busy}
                className={i % 2 ? "rotate-1" : "-rotate-1"}
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-zinc-500">
        Captions are anonymous + shuffled. Winner gets a point, the judge gets a point for taste.
      </p>
    </div>
  );
}

function MemeRoundEndView({
  room,
  winner,
  latestRound,
  winningCaption,
  onNext,
  onEnd,
  busy,
}: {
  room: Room;
  winner: RoundWinnerInfo | null;
  latestRound: Round | null;
  winningCaption: string | null;
  onNext: () => void;
  onEnd: () => void;
  busy: boolean;
}) {
  const win =
    winner ??
    (latestRound && latestRound.round_number === room.round_number
      ? {
          player_name: latestRound.winner_player_name ?? "Someone",
          player_id: latestRound.winner_player_id ?? "",
          points: 0,
          caption_id: latestRound.winner_caption_id,
          auto: false,
        }
      : null);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-dim p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-zinc-950">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display text-lg font-extrabold text-accent">{win?.player_name} takes it 👑</p>
          <p className="text-sm text-zinc-300">Point on the board. The judge scores a point for good taste.</p>
        </div>
      </div>

      {room.current_image_url && (
        <div className="rounded-3xl border border-edge bg-surface p-3">
          <SmartMeme
            src={room.current_image_url}
            alt=""
            maxHeight="max-h-[45vh]"
            width={room.current_image_width ?? undefined}
            height={room.current_image_height ?? undefined}
            sizes="100vw"
          />
        </div>
      )}

      {win?.caption_id && winningCaption && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Winning caption</p>
          <div className="mt-2 max-w-sm">
            <CaptionCard text={winningCaption} selected rotate={-1} disabled className="pointer-events-none" />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="lg" onClick={onNext} loading={busy}>
          <SkipForward className="h-4 w-4" />
          Next round
        </Button>
        <Button size="lg" variant="danger" onClick={onEnd}>
          <Square className="h-4 w-4" />
          End game
        </Button>
      </div>
    </div>
  );
}

function PlayerPanel({
  roster,
  submissions,
  title = "Players",
  playedIds,
}: {
  roster: { player_id: string; player_name: string }[];
  submissions: Submission[];
  title?: string;
  playedIds?: Set<string>;
}) {
  return (
    <div className="rounded-2xl border border-edge bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
      {roster.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No one's joined yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {roster.map((p) => {
            const done = playedIds ? playedIds.has(p.player_id) : submissions.some((s) => s.player_id === p.player_id);
            return (
              <div key={p.player_id} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-edge-2 text-xs font-bold text-zinc-200">
                  {p.player_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-zinc-200">{p.player_name}</span>
                {done ? (
                  <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                    In
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                    Waiting
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge-2 border-t-accent" />
        <p className="text-sm text-zinc-500">Joining room…</p>
      </div>
    </div>
  );
}

function NotFoundScreen({ code }: { code: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-3xl font-extrabold tracking-widest text-zinc-600">{code}</p>
      <div>
        <p className="text-lg font-bold text-zinc-100">Room not found</p>
        <p className="mt-1 text-sm text-zinc-500">It may have never existed, or the night already ended.</p>
      </div>
      <Button variant="outline" onClick={() => router.push("/")}>
        Back home
      </Button>
    </div>
  );
}

function ConfigScreen() {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-bold text-zinc-100">Supabase isn't connected</p>
      <p className="max-w-sm text-sm text-zinc-500">
        Copy <code className="rounded bg-surface-2 px-1">.env.local.example</code> to{" "}
        <code className="rounded bg-surface-2 px-1">.env.local</code> and add your keys.
      </p>
      <Button variant="outline" onClick={() => router.push("/")}>
        Back home
      </Button>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, DoorOpen, Gavel, ImagePlus, ListPlus, Maximize, MessageSquare, PenLine, RefreshCw, SkipForward, Sparkles, ThumbsUp, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { CaptionCard } from "@/components/caption-card";
import { MemePickerDrawer } from "@/components/meme-picker-drawer";
import { NameModal } from "@/components/name-modal";
import { RoomChat } from "@/components/room-chat";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/ui/confetti";
import { MemeImage, SmartMeme } from "@/components/ui/meme-image";
import { PhaseBadge, RoomCodeChip } from "@/components/room/shared";
import { usePlayer } from "@/hooks/use-player";
import { useRoom } from "@/hooks/use-room";
import { playCaption, playCustomCaption } from "@/lib/captions";
import { saveCommunityPrompt } from "@/lib/prompts";
import { requireSupabase } from "@/lib/supabase/client";
import type { AnonymousCaption, HandCard, MemeSource, PromptCategory, RevealItem, Room, Round, RoundWinnerInfo, Twist } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerViewProps {
  code: string;
}

export function PlayerView({ code }: PlayerViewProps) {
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
    revealSubmissions,
    votes,
    twist,
    handCards,
    roundCaptions,
    revealedCaptions,
    roundWinner,
    messages,
    schemaError,
  } = roomState;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fsUrl, setFsUrl] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [judgePicked, setJudgePicked] = useState(false);
  const [queueDraft, setQueueDraft] = useState("");
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [deckStatus, setDeckStatus] = useState<string | null>(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [customCaptionDraft, setCustomCaptionDraft] = useState("");

  const latestRound = rounds[0] ?? null;
  const winner =
    latestRound && latestRound.round_number === (room?.round_number ?? -1) && latestRound.winner_player_id
      ? latestRound
      : null;

  const mySubmission = submissions.find((s) => s.player_id === me.playerId) ?? null;
  const iWon = Boolean(winner && winner.winner_player_id === me.playerId);
  const myVote =
    (room && votes.find((v) => v.voter_player_id === me.playerId && v.round_number === room.round_number)) ?? null;

  const iAmJudge = Boolean(room && room.mode === "meme_me" && room.judge_player_id === me.playerId);
  const myHand = handCards.filter((h) => h.player_id === me.playerId && !h.played);
  const myPlayed =
    handCards.find((h) => h.player_id === me.playerId && h.played && h.round_played === room?.round_number) ?? null;
  const currentRoundCaptions = roundCaptions.filter((c) => c.round_number === room?.round_number);
  // Custom text caption played by this player in the current round (not from the deck)
  const myCustomCaption =
    currentRoundCaptions.find((c) => c.player_id === me.playerId && !c.caption_id) ?? null;

  const wonRef = useRef(false);
  useEffect(() => {
    if (iWon && !wonRef.current) setBurst((b) => b + 1);
    wonRef.current = iWon;
  }, [iWon]);

  useEffect(() => {
    setJudgePicked(false);
  }, [room?.round_number, room?.status]);

  const [chatSeenCount, setChatSeenCount] = useState(0);
  useEffect(() => {
    if (chatOpen) setChatSeenCount(messages.length);
  }, [chatOpen, messages.length]);
  const unread = chatOpen ? 0 : Math.max(0, messages.length - chatSeenCount);

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

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFsUrl(null);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const submitMeme = async (meme: MemeSource) => {
    if (!room) return;
    setBusy(true);
    setSubmitError("");
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
        setSubmitError(error.message);
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
    } finally {
      setBusy(false);
    }
  };

  const suggestPrompt = async () => {
    const text = queueDraft.trim();
    if (!text || !room) return;
    setQueueStatus(null);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("prompt_queue")
        .insert({
          room_code: code,
          player_id: me.playerId,
          player_name: me.name,
          prompt: text,
          status: "queued",
        })
        .select("id");
      if (error) {
        setQueueStatus("Couldn't queue that. Try again.");
        return;
      }
      setQueueDraft("");
      const queued = data?.[0]?.id;
      const { data: count } = await supabase
        .from("prompt_queue")
        .select("id", { count: "exact", head: true })
        .eq("room_code", code)
        .eq("status", "queued");
      setQueueStatus(queued ? `You're in line — #${count ?? 1} up for the next prompt.` : null);
      await supabase.from("room_messages").insert({
        room_code: code,
        sender_player_id: "system",
        sender_name: "System",
        kind: "system",
        text: `🎤 @${me.name} queued a prompt: "${text}"`,
      });
    } finally {
      setBusy(false);
    }
  };

  const saveToDeck = async () => {
    const text = queueDraft.trim();
    if (!text || !room || deckBusy) return;
    setDeckBusy(true);
    setDeckStatus(null);
    try {
      await saveCommunityPrompt({
        prompt: text,
        category: (room.prompt_category ?? "general") as PromptCategory,
        adult: room.allow_adult ?? false,
        authorName: me.name,
      });
      setQueueDraft("");
      setDeckStatus("Saved to the deck — it can show up in any room.");
    } catch {
      setDeckStatus("Couldn't save that prompt.");
    } finally {
      setDeckBusy(false);
    }
  };

  const judgePickImage = async (meme: MemeSource) => {
    if (!room) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      await supabase
        .from("rooms")
        .update({
          current_image_url: meme.url,
          current_image_width: meme.width ?? null,
          current_image_height: meme.height ?? null,
        })
        .eq("code", code);
      roomState.send("judge_pick_image", {
        round: room.round_number,
        image: { url: meme.url, width: meme.width, height: meme.height },
        judge_player_id: me.playerId,
        judge_name: me.name || "The judge",
      });
      await supabase.from("room_messages").insert({
        room_code: code,
        sender_player_id: "system",
        sender_name: "System",
        kind: "system",
        text: `🖼️ @${me.name || "The judge"} picked the image card — captions on!`,
      });
    } finally {
      setBusy(false);
    }
  };

  const playCard = async (card: HandCard) => {
    if (!room) return;
    setBusy(true);
    setSubmitError("");
    try {
      const ok = await playCaption(room, me.playerId, card);
      if (ok) {
        roomState.send("card_played", {
          round: room.round_number,
          player_id: me.playerId,
          played_count: currentRoundCaptions.length + 1,
          total: Math.max(1, roster.length - 1),
        });
      } else {
        setSubmitError("Couldn't play that card. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitCustomCaption = async (text: string) => {
    if (!room || !text.trim()) return;
    setBusy(true);
    setSubmitError("");
    try {
      const ok = await playCustomCaption(room, me.playerId, text);
      if (ok) {
        setCustomCaptionDraft("");
        roomState.send("card_played", {
          round: room.round_number,
          player_id: me.playerId,
          played_count: currentRoundCaptions.length + 1,
          total: Math.max(1, roster.length - 1),
        });
      } else {
        setSubmitError("Couldn't submit your caption. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const skipRound = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      // Insert a sentinel so auto-reveal count still reaches total
      await supabase.from("round_captions").upsert(
        {
          room_code: room.code,
          round_number: room.round_number,
          player_id: me.playerId,
          caption_id: null,
          text: "__SKIPPED__",
          was_auto: true,
        },
        { onConflict: "room_code,round_number,player_id" },
      );
      roomState.send("card_played", {
        round: room.round_number,
        player_id: me.playerId,
        played_count: currentRoundCaptions.length + 1,
        total: Math.max(1, roster.length - 1),
      });
    } finally {
      setBusy(false);
    }
  };

  const leaveRoom = async () => {
    try {
      const supabase = requireSupabase();
      await supabase.from("players").delete().eq("room_code", code).eq("player_id", me.playerId);
      await supabase.from("room_messages").insert({
        room_code: code,
        sender_player_id: "system",
        sender_name: "System",
        kind: "system",
        text: `👋 @${me.name || "A player"} left the game.`,
      });
    } catch {
      // best-effort
    }
    router.push("/");
  };

  const judgePickCaption = (caption: AnonymousCaption) => {
    if (!room) return;
    setJudgePicked(true);
    roomState.send("judge_pick", { round: room.round_number, caption_id: caption.id });
  };

  const handlePickerSelect = (meme: MemeSource) => {
    if (room?.mode === "meme_me") void judgePickImage(meme);
    else void submitMeme(meme);
  };

  const openFullscreen = (url: string) => {
    setFsUrl(url);
    try {
      void document.documentElement.requestFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  const closeFullscreen = () => {
    setFsUrl(null);
    if (document.fullscreenElement) void document.exitFullscreen?.();
  };

  const castVote = async (item: RevealItem) => {
    if (!room || winner) return;
    if (item.player_id === me.playerId) {
      openFullscreen(item.meme_url);
      return;
    }
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const round = room.round_number;
      const { error } = await supabase.from("votes").upsert(
        {
          room_code: code,
          round_number: round,
          voter_player_id: me.playerId,
          target_player_id: item.player_id,
          meme_url: item.meme_url,
        },
        { onConflict: "room_code,round_number,voter_player_id" },
      );
      if (!error) {
        roomState.send("vote", {
          round,
          voter_player_id: me.playerId,
          target_player_id: item.player_id,
          meme_url: item.meme_url,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const castCaptionVote = async (caption: AnonymousCaption) => {
    if (!room || iAmJudge || judgePicked) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const round = room.round_number;
      // Using caption.id as the target_player_id and meme_url so it satisfies the NOT NULL constraint and allows tracking votes per caption
      const { error } = await supabase.from("votes").upsert(
        {
          room_code: code,
          round_number: round,
          voter_player_id: me.playerId,
          target_player_id: caption.id,
          meme_url: caption.id,
        },
        { onConflict: "room_code,round_number,voter_player_id" },
      );
      if (!error) {
        roomState.send("vote", {
          round,
          voter_player_id: me.playerId,
          target_player_id: caption.id,
          meme_url: caption.id,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!configured) return <ConfigScreen />;
  if (loading) return <LoadingScreen />;
  if (notFound || !room) return <NotFoundScreen code={code} />;

  const revealList = revealSubmissions ?? submissions.map((s) => ({
    id: s.id,
    player_id: s.player_id,
    player_name: s.player_name,
    meme_url: s.meme_url,
    meme_tag: s.meme_tag,
  }));

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-safe pt-safe">
      <header className="flex items-center justify-between py-3">
        <Brand size="sm" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatOpen(true)}
            className="relative rounded-full border border-edge bg-surface-2 p-2 text-zinc-300 active:scale-95"
            aria-label="Open room chat"
          >
            <MessageSquare className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-zinc-950">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <RoomCodeChip code={room.code} />
          <PhaseBadge status={room.status} />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 py-2">
        {schemaError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <span>{schemaError}</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={room.status + (room.round_number)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-1 flex-col gap-5"
          >
            {room.status === "lobby" && (
              <WaitingView code={room.code} roomName={room.host_name} />
            )}

            {room.status === "submitting" && room.mode === "meme_me" && (
              <MemePlayerSubmitView
                room={room}
                iAmJudge={iAmJudge}
                myHand={myHand}
                myPlayed={myPlayed}
                myCustomCaption={myCustomCaption}
                playedCount={currentRoundCaptions.length}
                totalSubmitters={Math.max(1, roster.length - 1)}
                onPickImage={() => setPickerOpen(true)}
                onPlay={playCard}
                onPlayCustom={submitCustomCaption}
                onSkip={skipRound}
                onLeave={leaveRoom}
                customCaptionDraft={customCaptionDraft}
                onCustomCaptionDraftChange={setCustomCaptionDraft}
                busy={busy}
                error={submitError}
              />
            )}

            {room.status === "submitting" && room.mode !== "meme_me" && (
              <SubmittingPlayerView
                prompt={room.current_prompt}
                promptAuthor={room.prompt_author}
                twist={twist}
                submittedCount={submissions.length}
                submissions={submissions}
                mySubmission={mySubmission}
                queueDraft={queueDraft}
                onQueueDraftChange={setQueueDraft}
                onSuggest={suggestPrompt}
                queueStatus={queueStatus}
                onSaveToDeck={saveToDeck}
                deckStatus={deckStatus}
                deckBusy={deckBusy}
                onPick={() => setPickerOpen(true)}
                onFullscreen={openFullscreen}
                busy={busy}
                error={submitError}
              />
            )}

            {room.status === "judging" && room.mode === "meme_me" && (
              <MemePlayerRevealView
                room={room}
                iAmJudge={iAmJudge}
                captions={revealedCaptions ?? []}
                picked={judgePicked}
                myVoteTargetId={myVote?.target_player_id ?? null}
                onPick={judgePickCaption}
                onVote={castCaptionVote}
              />
            )}

            {room.status === "round_end" && room.mode === "meme_me" && (
              <MemePlayerRoundEndView
                room={room}
                winner={roundWinner}
                latestRound={latestRound}
                winningCaption={
                  (roundWinner?.caption_id ?? latestRound?.winner_caption_id ?? null)
                    ? roundCaptions.find((c) => c.id === (roundWinner?.caption_id ?? latestRound?.winner_caption_id))?.text ?? null
                    : null
                }
                iWon={iWon}
              />
            )}

            {room.status === "revealing" && (
              <RevealPlayerView
                prompt={room.current_prompt}
                items={revealList}
                myPlayerId={me.playerId}
                myVoteTargetId={myVote?.target_player_id ?? null}
                winner={winner ? { name: (winner as Round).winner_player_name ?? "Someone", iWon } : null}
                onVote={castVote}
                onFullscreen={openFullscreen}
              />
            )}

            {room.status === "ended" && (
              <EndedPlayerView
                leaderboard={leaderboard}
                iWon={iWon}
                onHome={() => router.push("/")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {room.status === "submitting" && room.mode !== "meme_me" && (
        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-2 pt-6">
          {!mySubmission ? (
            <Button size="xl" block onClick={() => setPickerOpen(true)}>
              <Maximize className="h-5 w-5" />
              Pick a Meme
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="lg" variant="outline" block onClick={() => openFullscreen(mySubmission.meme_url)}>
                <Maximize className="h-4 w-4" />
                Full screen
              </Button>
              <Button size="lg" block onClick={() => setPickerOpen(true)}>
                <RefreshCw className="h-4 w-4" />
                Change
              </Button>
            </div>
          )}
        </div>
      )}

      <MemePickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />

      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm"
            />
            <motion.div
              key="chat-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-edge bg-surface pb-safe"
            >
              <div className="flex items-center justify-between px-5 pt-3">
                <div className="flex flex-col">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge-2" />
                  <h2 className="font-display text-base font-bold">Room chat</h2>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="-mr-2 rounded-full p-2 text-zinc-400 hover:bg-surface-2 hover:text-zinc-100"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 px-4 pb-4 pt-3">
                <RoomChat
                  code={code}
                  mePlayerId={me.playerId}
                  meName={me.name}
                  messages={messages}
                  maxHeight="max-h-[60dvh]"
                  className="h-full"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fsUrl && <FullScreenOverlay url={fsUrl} onClose={closeFullscreen} />}
      </AnimatePresence>

      <ConfettiBurst burst={burst} />

      <NameModal
        open={!me.hasName && !loading}
        title="What's your name?"
        subtitle="It shows on the leaderboard."
        submitLabel="Join"
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

function WaitingView({ code, roomName }: { code: string; roomName: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping-slow rounded-3xl bg-accent/20" />
        <div className="relative rounded-3xl border border-edge bg-surface px-8 py-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Room code</p>
          <p className="mt-1 text-5xl font-extrabold tracking-[0.2em] text-accent text-glow">{code}</p>
        </div>
      </div>
      <div>
        <p className="text-lg font-bold text-zinc-100">Waiting for {roomName || "the host"}</p>
        <p className="mt-1 text-sm text-zinc-500">The first prompt drops any second.</p>
      </div>
    </div>
  );
}

function SubmittingPlayerView({
  prompt,
  promptAuthor,
  twist,
  submittedCount,
  submissions,
  mySubmission,
  queueDraft,
  onQueueDraftChange,
  onSuggest,
  queueStatus,
  onSaveToDeck,
  deckStatus,
  deckBusy,
  onPick,
  onFullscreen,
  busy,
  error,
}: {
  prompt: string | null;
  promptAuthor: string | null;
  twist: Twist | null;
  submittedCount: number;
  submissions: { player_id: string; player_name: string; meme_url: string }[];
  mySubmission: { meme_url: string } | null;
  queueDraft: string;
  onQueueDraftChange: (v: string) => void;
  onSuggest: () => void;
  queueStatus: string | null;
  onSaveToDeck: () => void;
  deckStatus: string | null;
  deckBusy: boolean;
  onPick: () => void;
  onFullscreen: (url: string) => void;
  busy: boolean;
  error: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {twist && (
        <motion.div
          initial={{ opacity: 0, y: -8, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          className="mx-auto -rotate-1 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-center"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
            {twist.emoji} {twist.title}
          </p>
          <p className="mt-0.5 text-xs text-amber-100">{twist.text}</p>
        </motion.div>
      )}

      <div className="rounded-3xl border border-edge bg-surface p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Prompt</p>
        <p className="mt-3 font-display text-2xl font-extrabold leading-snug tracking-tight text-zinc-50">
          {prompt}
        </p>
        {promptAuthor && (
          <p className="mt-2 text-xs font-semibold text-accent">Asked by @{promptAuthor}</p>
        )}
      </div>

      {mySubmission ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent-dim px-4 py-3">
            <Check className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-zinc-200">
              Submitted{mySubmission && ` · ${submittedCount} in so far`}
            </p>
          </div>
          <button
            onClick={() => onFullscreen(mySubmission.meme_url)}
            className="relative overflow-hidden rounded-2xl border border-edge bg-surface-2 active:scale-[0.99]"
          >
            <div className="relative w-full" style={{ aspectRatio: "4 / 3", minHeight: 120 }}>
              <MemeImage src={mySubmission.meme_url} alt="" fit="contain" sizes="100vw" />
            </div>
            <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-zinc-950/70 px-3 py-1.5 text-xs font-semibold text-zinc-100 backdrop-blur-sm">
              <Maximize className="h-3.5 w-3.5" />
              Show to the room
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-edge-2 py-8 text-center">
          <p className="text-sm font-semibold text-zinc-300">Your move</p>
          <p className="px-8 text-xs text-zinc-500">
            Tap <span className="font-semibold text-zinc-300">Pick a Meme</span> below. Search the vault,
            Giphy, Telegram stickers, or upload your own.
          </p>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {busy && <p className="text-center text-xs text-zinc-500">Sending…</p>}

      {!mySubmission && (
        <div className="rounded-2xl border border-edge bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">In this round</p>
          <p className="mt-2 text-2xl font-extrabold text-accent">{submittedCount}</p>
          <p className="text-xs text-zinc-500">memes submitted so far</p>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="rounded-2xl border border-edge bg-surface p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-bold text-zinc-200">Live memes</p>
            <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
              {submittedCount}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 items-start">
            {submissions.map((sub) => (
              <button
                key={sub.player_id}
                onClick={() => onFullscreen(sub.meme_url)}
                className="w-full overflow-hidden rounded-2xl border border-edge bg-surface-2 active:scale-[0.98]"
              >
                {/* Fixed aspect wrapper prevents layout shift while image loads */}
                <div className="relative w-full" style={{ aspectRatio: "1 / 1", minHeight: 80 }}>
                  <MemeImage src={sub.meme_url} alt="" fit="contain" sizes="50vw" />
                </div>
                <p className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400">@{sub.player_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-edge bg-surface p-4">
        <div className="flex items-center gap-2">
          <ListPlus className="h-4 w-4 text-accent" />
          <p className="text-sm font-bold text-zinc-200">Call the next prompt</p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Queue yourself a turn — your prompt gets used automatically when the host starts the next round.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={queueDraft}
            onChange={(e) => onQueueDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && queueDraft.trim() && !busy && onSuggest()}
            placeholder="e.g. Describe this without naming it"
            maxLength={120}
            className="h-10 min-w-0 flex-1 rounded-full border border-edge bg-surface-2 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
          />
          <Button size="sm" onClick={onSuggest} disabled={!queueDraft.trim() || busy}>
            Queue me
          </Button>
          <Button size="sm" variant="ghost" onClick={onSaveToDeck} disabled={!queueDraft.trim() || deckBusy}>
            {deckBusy ? "Saving…" : "Save to deck"}
          </Button>
        </div>
        {(queueStatus || deckStatus) && <p className="mt-2 text-xs text-accent">{queueStatus || deckStatus}</p>}
        <p className="mt-1.5 text-[11px] text-zinc-500">
          "Save to deck" adds it to the shared prompt pool for any room — no need to be queued.
        </p>
      </div>
    </div>
  );
}

export function MemePlayerSubmitView({
  room,
  iAmJudge,
  myHand,
  myPlayed,
  myCustomCaption,
  playedCount,
  totalSubmitters,
  onPickImage,
  onPlay,
  onPlayCustom,
  onSkip,
  onLeave,
  customCaptionDraft,
  onCustomCaptionDraftChange,
  busy,
  error,
}: {
  room: Room;
  iAmJudge: boolean;
  myHand: HandCard[];
  myPlayed: HandCard | null;
  myCustomCaption?: { text: string } | null;
  playedCount: number;
  totalSubmitters: number;
  onPickImage: () => void;
  onPlay: (card: HandCard) => void;
  onPlayCustom?: (text: string) => void;
  onSkip?: () => void;
  onLeave?: () => void;
  customCaptionDraft?: string;
  onCustomCaptionDraftChange?: (v: string) => void;
  busy: boolean;
  error: string;
}) {
  const hasImage = Boolean(room.current_image_url);
  const myPlayedText = myPlayed?.text ?? myCustomCaption?.text;
  
  return (
    <div className="flex flex-col gap-5">
      {iAmJudge && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
          <Gavel className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm font-semibold text-amber-200">You're the judge this round</p>
        </div>
      )}

      {!hasImage ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-edge-2 bg-surface p-8 text-center">
          <Gavel className="h-8 w-8 text-amber-300" />
          <div>
            <p className="text-lg font-bold text-zinc-100">
              {iAmJudge ? "Your call, judge" : "Waiting on the judge…"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {iAmJudge
                ? "Pick an image card. Everyone else plays a caption from their hand."
                : "The judge is picking the image card for this round."}
            </p>
          </div>
          {iAmJudge && (
            <Button size="lg" onClick={onPickImage} loading={busy}>
              <ImagePlus className="h-4 w-4" />
              Pick an image card
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-edge bg-surface p-3">
            <SmartMeme
              src={room.current_image_url!}
              alt=""
              maxHeight="max-h-[45vh]"
              width={room.current_image_width ?? undefined}
              height={room.current_image_height ?? undefined}
              sizes="100vw"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-edge bg-surface px-4 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-zinc-500" />
            <p className="text-sm text-zinc-400">
              {iAmJudge ? "Caption cards are rolling in…" : "Play the funniest caption for this image."}{" "}
              <span className="font-semibold text-accent">
                {playedCount} of {totalSubmitters}
              </span>{" "}
              in.
            </p>
          </div>

          {iAmJudge ? (
            <p className="text-center text-sm text-zinc-500">You judge, everyone else plays.</p>
          ) : myPlayedText ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Your play</p>
              <CaptionCard text={myPlayedText} selected rotate={-1} />
              <p className="text-center text-xs text-zinc-500">
                Locked in. Tap another card in your hand or submit a new custom caption to change it before the reveal.
              </p>
            </div>
          ) : myHand.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">Your hand is empty — the host is dealing.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Your hand · tap to play</p>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {myHand.map((card) => (
                  <div key={card.id} className="w-44 shrink-0">
                    <CaptionCard text={card.text} onClick={() => onPlay(card)} disabled={busy} />
                  </div>
                ))}
              </div>

              {/* Custom caption input */}
              {onPlayCustom && (
                <div className="rounded-2xl border border-dashed border-edge-2 bg-surface p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PenLine className="h-3.5 w-3.5 text-accent" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Write your own</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customCaptionDraft ?? ""}
                      onChange={(e) => onCustomCaptionDraftChange?.(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !busy && customCaptionDraft?.trim() && onPlayCustom(customCaptionDraft)
                      }
                      placeholder="Type anything…"
                      maxLength={200}
                      className="h-10 min-w-0 flex-1 rounded-full border border-edge bg-surface-2 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => customCaptionDraft?.trim() && onPlayCustom(customCaptionDraft)}
                      disabled={!customCaptionDraft?.trim() || busy}
                    >
                      Play
                    </Button>
                  </div>
                </div>
              )}

              {/* Skip / Leave row */}
              {(onSkip || onLeave) && (
                <div className="flex items-center gap-2">
                  {onSkip && (
                    <button
                      onClick={onSkip}
                      disabled={busy}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-edge py-2 text-xs font-semibold text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      Skip this round
                    </button>
                  )}
                  {onLeave && (
                    <button
                      onClick={onLeave}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-500/30 py-2 text-xs font-semibold text-red-400 transition-colors hover:border-red-400 hover:text-red-300"
                    >
                      <DoorOpen className="h-3.5 w-3.5" />
                      Leave game
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}

function MemePlayerRevealView({
  room,
  iAmJudge,
  captions,
  picked,
  myVoteTargetId,
  onPick,
  onVote,
}: {
  room: Room;
  iAmJudge: boolean;
  captions: AnonymousCaption[];
  picked: boolean;
  myVoteTargetId?: string | null;
  onPick: (caption: AnonymousCaption) => void;
  onVote?: (caption: AnonymousCaption) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {iAmJudge && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
          <Gavel className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm font-semibold text-amber-200">
            {picked ? "Pick locked in — nice taste." : "You're the judge — tap the funniest caption."}
          </p>
        </div>
      )}

      {room.current_image_url && (
        <div className="rounded-3xl border border-edge bg-surface p-3">
          <SmartMeme
            src={room.current_image_url}
            alt=""
            maxHeight="max-h-[40vh]"
            width={room.current_image_width ?? undefined}
            height={room.current_image_height ?? undefined}
            sizes="100vw"
          />
        </div>
      )}

      {!iAmJudge && !myVoteTargetId && (
        <div className="flex items-center gap-2 rounded-2xl border border-edge bg-surface px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-zinc-500" />
          <p className="text-sm text-zinc-400">The judge is deciding… vote for your favorite in the meantime!</p>
        </div>
      )}
      {!iAmJudge && myVoteTargetId && (
        <div className="flex items-center gap-2 rounded-2xl border border-edge bg-surface px-4 py-3">
          <ThumbsUp className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200">Vote locked in. Let's see who the judge picks!</p>
        </div>
      )}

      {captions.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">No captions this round.</p>
      ) : (
        <div className={cn("flex flex-col gap-3", iAmJudge && !picked && "mb-2")}>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {iAmJudge ? "Anonymous captions" : "The room's captions"}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {captions.map((c, i) => (
              <div key={c.id} className="relative">
                <CaptionCard
                  text={c.text}
                  onClick={iAmJudge && !picked ? () => onPick(c) : (!iAmJudge && !myVoteTargetId && onVote ? () => onVote(c) : undefined)}
                  disabled={(iAmJudge && picked) || (!iAmJudge && myVoteTargetId !== null && myVoteTargetId !== c.id)}
                  className={cn(
                    i % 2 ? "rotate-1" : "-rotate-1", 
                    iAmJudge && !picked && "cursor-pointer",
                    !iAmJudge && !myVoteTargetId && "cursor-pointer active:scale-[0.98]",
                    myVoteTargetId === c.id && "ring-2 ring-amber-400 border-amber-400/50"
                  )}
                />
                {!iAmJudge && myVoteTargetId === c.id && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-lg z-10">
                    <ThumbsUp className="h-3 w-3" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemePlayerRoundEndView({
  room,
  winner,
  latestRound,
  winningCaption,
  iWon,
}: {
  room: Room;
  winner: RoundWinnerInfo | null;
  latestRound: Round | null;
  winningCaption: string | null;
  iWon: boolean;
}) {
  const win =
    winner ??
    (latestRound && latestRound.round_number === room.round_number
      ? {
          player_name: latestRound.winner_player_name ?? "Someone",
          caption_id: latestRound.winner_caption_id,
          points: 0,
        }
      : null);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-dim p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-zinc-950">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display text-lg font-extrabold text-accent">
            {iWon ? "You took it! 👑" : `${win?.player_name} takes it`}
          </p>
          <p className="text-sm text-zinc-300">Point on the board. Next round loading…</p>
        </div>
      </div>

      {room.current_image_url && (
        <div className="rounded-3xl border border-edge bg-surface p-3">
          <SmartMeme
            src={room.current_image_url}
            alt=""
            maxHeight="max-h-[40vh]"
            width={room.current_image_width ?? undefined}
            height={room.current_image_height ?? undefined}
            sizes="100vw"
          />
        </div>
      )}

      {win?.caption_id && winningCaption && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Winning caption</p>
          <div className="mt-2">
            <CaptionCard text={winningCaption} selected rotate={-1} disabled className="pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}

function RevealPlayerView({
  prompt,
  items,
  myPlayerId,
  myVoteTargetId,
  winner,
  onVote,
  onFullscreen,
}: {
  prompt: string | null;
  items: RevealItem[];
  myPlayerId: string;
  myVoteTargetId: string | null;
  winner: { name: string; iWon: boolean } | null;
  onVote: (item: RevealItem) => void;
  onFullscreen: (url: string) => void;
}) {
  const totalVotes = items.length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg font-bold text-zinc-100">{prompt}</p>
      </div>

      {winner && (
        <div className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-dim p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-zinc-950">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold text-accent">
              {winner.iWon ? "You took it! 👑" : `${winner.name} takes it`}
            </p>
            <p className="text-sm text-zinc-300">Point on the board. Next round loading…</p>
          </div>
        </div>
      )}

      {!winner && (
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          The room's memes · tap to vote
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 items-start">
        {items.map((item, i) => {
          const mine = item.player_id === myPlayerId;
          const voted = myVoteTargetId === item.player_id;
          return (
            <button
              key={item.id}
              onClick={() => onVote(item)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border bg-surface-2 transition-all",
                mine ? "border-accent/70" : "border-edge",
                voted && !mine && "border-amber-400 ring-2 ring-amber-400/60",
                !winner && "active:scale-[0.98]",
              )}
            >
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
              >
                <SmartMeme src={item.meme_url} alt="" maxHeight="max-h-[40vh]" sizes="50vw" />
              </motion.div>

              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950/70 backdrop-blur-sm">
                <Maximize className="h-3.5 w-3.5 text-zinc-300" />
              </span>

              {mine && (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-zinc-950">
                  <Crown className="h-3 w-3" />
                  Yours
                </span>
              )}

              {voted && !mine && !winner && (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
                  <ThumbsUp className="h-3 w-3" />
                  Your vote
                </span>
              )}

              {!winner && !mine && !voted && (
                <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                  <span className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-zinc-950">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Vote
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!winner && (
        <p className="text-center text-xs text-zinc-500">
          {myVoteTargetId
            ? "Vote locked in. The host can crown the room's favorite. 👀"
            : totalVotes > 0
              ? "Tap a meme to vote for it. Tap your own to show it full screen."
              : "Tap your own meme to show it full screen."}
        </p>
      )}
    </div>
  );
}

function EndedPlayerView({
  leaderboard,
  iWon,
  onHome,
}: {
  leaderboard: { player_id: string; player_name: string; points: number }[];
  iWon: boolean;
  onHome: () => void;
}) {
  const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-edge bg-surface p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-3 text-2xl font-extrabold text-zinc-50">
          {iWon ? "You won the night" : "Game over"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Bring the memes next time.</p>
      </div>

      <div className="rounded-2xl border border-edge bg-surface p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Final scores</p>
        {sorted.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No points were won.</p>
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
                <span className={cn("w-5 text-center text-sm font-extrabold", i === 0 ? "text-accent" : "text-zinc-500")}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-semibold text-zinc-100">{entry.player_name}</span>
                <span className="rounded-full bg-zinc-950/40 px-2 py-0.5 text-xs font-bold text-accent">
                  {entry.points}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Button size="xl" variant="outline" onClick={onHome}>
        Back home
      </Button>
    </div>
  );
}

function FullScreenOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Full screen</p>
        <button
          onClick={onClose}
          className="rounded-full bg-zinc-900/90 p-2.5 text-zinc-200 active:scale-95"
          aria-label="Close full screen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 p-2">
        <MemeImage src={url} alt="" fit="contain" sizes="100vw" />
      </div>
    </motion.div>
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
        <p className="mt-1 text-sm text-zinc-500">Check the code and try again.</p>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import type { RoomMessage } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { MemeImage } from "@/components/ui/meme-image";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface RoomChatProps {
  code: string;
  mePlayerId: string;
  meName: string;
  messages: RoomMessage[];
  className?: string;
  maxHeight?: string;
}

export function RoomChat({ code, mePlayerId, meName, messages, className, maxHeight = "max-h-72" }: RoomChatProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<RoomMessage[]>([]);

  const displayMessages = [...messages];
  for (const pending of optimisticMessages) {
    if (!displayMessages.some(m => m.id === pending.id)) {
      displayMessages.push(pending);
    }
  }
  displayMessages.sort((a, b) => a.created_at.localeCompare(b.created_at));

  useEffect(() => {
    setOptimisticMessages(prev => prev.filter(p => !messages.some(m => m.id === p.id)));
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayMessages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setSendError(null);
    setDraft("");

    const id = crypto.randomUUID ? crypto.randomUUID() : `opt-${Date.now()}-${Math.random()}`;
    const optimisticMsg: RoomMessage = {
      id,
      room_code: code,
      sender_player_id: mePlayerId,
      sender_name: meName,
      kind: "text",
      text,
      created_at: new Date().toISOString(),
      meme_url: null,
      meme_width: null,
      meme_height: null,
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMsg]);

    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("room_messages").insert({
        id: optimisticMsg.id,
        room_code: code,
        sender_player_id: mePlayerId,
        sender_name: meName,
        kind: "text",
        text,
      });
      if (error) {
        setSendError(errorMessage(error, "Couldn't send — try again."));
        setOptimisticMessages(prev => prev.filter(m => m.id !== id));
        return;
      }
    } catch {
      setSendError("Failed to send.");
      setOptimisticMessages(prev => prev.filter(m => m.id !== id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-edge bg-surface", className)}>
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <MessageSquare className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Room chat</p>
      </div>
      <div ref={scrollRef} className={cn("flex flex-col gap-2 overflow-y-auto p-3", maxHeight)}>
        {displayMessages.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-600">No messages yet. Memes sent this round show up here live.</p>
        ) : (
          <AnimatePresence initial={false}>
            {displayMessages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                <MessageBubble message={m} isOwn={m.sender_player_id === mePlayerId} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-edge p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !sending && void send()}
          placeholder="Say something…"
          maxLength={240}
          className="h-9 min-w-0 flex-1 rounded-full border border-edge bg-surface-2 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
        />
        <Button size="sm" variant="ghost" onClick={() => void send()} disabled={!draft.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {sendError && <p className="border-t border-edge px-3 py-1.5 text-[11px] text-red-400">{sendError}</p>}
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: RoomMessage; isOwn: boolean }) {
  if (message.kind === "system") {
    return <p className="text-center text-[11px] italic text-zinc-500">{message.text}</p>;
  }

  const isMeme = message.kind === "meme" && message.meme_url;

  const textBubble =
    "rounded-2xl px-3 py-2 text-sm shadow-sm " +
    (isOwn ? "rounded-br-sm bg-accent/15 text-zinc-100" : "rounded-bl-sm bg-surface-2 border border-edge text-zinc-200");

  return (
    <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
      <span className="mb-0.5 px-1 text-[10px] font-semibold text-zinc-500">{message.sender_name}</span>
      {isMeme ? (
        <div className={cn(
          "drop-shadow-xl transition-transform hover:scale-105", 
          isOwn ? "origin-bottom-right" : "origin-bottom-left"
        )}>
          {/* Fixed-size wrapper prevents layout reflow while image loads */}
          <div
            className="relative w-40 sm:w-48"
            style={{
              aspectRatio:
                message.meme_width && message.meme_height
                  ? `${message.meme_width} / ${message.meme_height}`
                  : "1 / 1",
              minHeight: 80,
            }}
          >
            <MemeImage
              src={message.meme_url!}
              alt=""
              fit="contain"
              sizes="192px"
            />
          </div>
        </div>
      ) : (
        <div className={textBubble}>{message.text}</div>
      )}
    </div>
  );
}

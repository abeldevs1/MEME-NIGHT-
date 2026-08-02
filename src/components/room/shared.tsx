"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn, formatPlayerCount } from "@/lib/utils";
import type { RoomStatus } from "@/lib/types";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-zinc-100",
        copied && "border-accent/50 text-accent",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : text}
    </button>
  );
}

export function ShareJoinLink({ code, className }: { code: string; className?: string }) {
  const href = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${code}/play`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-zinc-500">
        <ExternalLink className="mr-1 inline h-3 w-3" />
        {href}
      </span>
      <CopyButton text={href} />
    </div>
  );
}

export function PhaseBadge({ status, count }: { status: RoomStatus; count?: number }) {
  const styles: Record<RoomStatus, string> = {
    lobby: "bg-surface-2 text-zinc-300 border-edge",
    submitting: "bg-accent-dim text-accent border-accent/30",
    revealing: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    judging: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    round_end: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    ended: "bg-surface-2 text-zinc-300 border-edge",
  };
  const labels: Record<RoomStatus, string> = {
    lobby: "Lobby",
    submitting: "Captions",
    revealing: "Reveal",
    judging: "Judging",
    round_end: "Winner",
    ended: "Game over",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        styles[status],
      )}
    >
      {labels[status]}
      {count !== undefined && (
        <span className="rounded-full bg-zinc-950/40 px-1.5 text-[10px]">{formatPlayerCount(count)}</span>
      )}
    </span>
  );
}

export function RoomCodeChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 rounded-xl border border-edge bg-surface-2 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Room</span>
      <span className="text-2xl font-extrabold tracking-[0.25em] text-accent text-glow">{code}</span>
    </span>
  );
}

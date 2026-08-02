"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Dices, Maximize, Radio, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { GiphySearch } from "@/components/giphy-search";
import { TelegramStickers } from "@/components/telegram-stickers";
import { Button } from "@/components/ui/button";
import { SmartMeme } from "@/components/ui/meme-image";
import { VaultBrowser } from "@/components/vault-browser";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase/client";
import type { MemeSource } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StageItem {
  url: string;
  id?: string;
  title?: string;
}

export function Displayer() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<StageItem[]>([]);
  const [idx, setIdx] = useState(-1);
  const [tab, setTab] = useState<"giphy" | "vault" | "telegram">("vault");
  const [isFs, setIsFs] = useState(false);
  const [trayOpen, setTrayOpen] = useState(true);

  const current = history[idx] ?? null;

  const onFsChange = useCallback(() => setIsFs(Boolean(document.fullscreenElement)), []);
  useEffect(() => {
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onFsChange]);

  const select = useCallback(
    (m: MemeSource) => {
      setHistory((prev) => [...prev.slice(0, idx + 1), { url: m.url, id: m.id, title: m.tag }]);
      setIdx((i) => i + 1);
    },
    [idx],
  );

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(history.length - 1, i + 1));

  const shuffle = async () => {
    if (!isSupabaseConfigured) return;
    const supabase = requireSupabase();
    const { count } = await supabase.from("memes").select("id", { count: "exact", head: true });
    if (!count) return;
    const offset = Math.floor(Math.random() * count);
    const { data } = await supabase.from("memes").select("url, id").range(offset, offset);
    const row = data?.[0];
    if (row) select({ kind: "vault", url: row.url, id: row.id, tag: "surprise" });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void stageRef.current?.requestFullscreen?.();
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Brand size="sm" />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Button>
          <Button size="sm" variant="outline" onClick={() => void shuffle()}>
            <Dices className="h-3.5 w-3.5" />
            Surprise me
          </Button>
          <Button size="sm" variant="outline" onClick={toggleFullscreen}>
            <Maximize className="h-3.5 w-3.5" />
            {isFs ? "Exit" : "Fullscreen"}
          </Button>
        </div>
      </header>

      <div ref={stageRef} className="relative flex min-h-0 flex-1 flex-col bg-black">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-3"
            >
              <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 p-3">
                <SmartMeme
                  src={current.url}
                  alt={current.title || ""}
                  eager
                  priority
                  maxHeight="max-h-[80vh]"
                  className="rounded-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrev}
                    disabled={idx === 0}
                    className="rounded-full bg-zinc-900/80 p-2 text-zinc-300 disabled:opacity-30"
                    aria-label="Previous"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <p className="max-w-xs truncate px-1 text-center text-xs font-semibold text-zinc-500">
                    {current.title || "meme night"}
                  </p>
                  <button
                    onClick={goNext}
                    disabled={idx >= history.length - 1}
                    className="rounded-full bg-zinc-900/80 p-2 text-zinc-300 disabled:opacity-30"
                    aria-label="Next"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
            >
              <Radio className="h-10 w-10 text-zinc-700" />
              <p className="font-display text-lg font-bold text-zinc-400">Nothing on the big screen yet</p>
              <p className="max-w-sm text-sm text-zinc-600">
                Pick a meme below — or hit <span className="font-semibold text-zinc-400">Surprise me</span> —
                and it beams up here.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {current && (
          <button
            onClick={() => setTrayOpen((v) => !v)}
            className="absolute bottom-3 right-3 rounded-full bg-zinc-900/80 p-2 text-zinc-400 hover:text-zinc-100"
            aria-label="Toggle meme tray"
          >
            {trayOpen ? <X className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {trayOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="flex max-h-[42dvh] flex-col border-t border-edge bg-surface"
          >
            <div className="flex gap-1.5 px-4 pt-2">
              {(["vault", "giphy", "telegram"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                    tab === t ? "bg-accent text-zinc-950" : "bg-surface-2 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {t === "giphy" ? "Search" : t === "telegram" ? "Telegram" : "Vault"}
                </button>
              ))}
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              {tab === "vault" ? (
                <VaultBrowser
                  onSelect={select}
                  onDelete={(id) => {
                    setHistory((prev) => {
                      const next = prev.filter((item) => item.id !== id);
                      const max = next.length - 1;
                      setIdx((i) => Math.min(i, max));
                      return next;
                    });
                  }}
                />
              ) : tab === "telegram" ? (
                <TelegramStickers onPick={select} />
              ) : (
                <GiphySearch onSelect={select} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

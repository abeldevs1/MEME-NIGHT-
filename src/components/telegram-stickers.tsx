"use client";

import { useState } from "react";
import { Download, Loader2, Send, TriangleAlert } from "lucide-react";
import { isSupabaseConfigured, MEME_VAULT_BUCKET, requireSupabase } from "@/lib/supabase/client";
import type { MemeSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MemeImage } from "@/components/ui/meme-image";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/vault-browser";

interface PackedSticker {
  id: string;
  emoji: string;
  width: number;
  height: number;
  animated: boolean;
  video: boolean;
  url: string;
}

interface StickerPack {
  name: string;
  title: string;
  count: number;
  stickers: PackedSticker[];
}

interface TelegramStickersProps {
  onPick?: (meme: MemeSource) => void;
}

export function TelegramStickers({ onPick }: TelegramStickersProps) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<StickerPack | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const fetchPack = async () => {
    setLoading(true);
    setError("");
    setHint("");
    setImported(0);
    try {
      const res = await fetch(`/api/stickers?pack=${encodeURIComponent(link)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error === "bad_token" ? "Telegram token problem" : (data.error ?? "Couldn't load that pack."));
        if (data.error === "missing_token" || data.error === "bad_token") setHint(data.hint ?? "");
        setPack(null);
        return;
      }
      setPack(data as StickerPack);
    } catch {
      setError("Couldn't reach the sticker service.");
      setPack(null);
    } finally {
      setLoading(false);
    }
  };

  const importAll = async () => {
    if (!pack || !isSupabaseConfigured) return;
    setImporting(true);
    setError("");
    const supabase = requireSupabase();
    const tag = pack.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const total = pack.stickers.length;
    const CONCURRENCY = 4;
    let done = 0;
    let idx = 0;
    const worker = async () => {
      while (idx < total) {
        const i = idx++;
        const s = pack.stickers[i];
        try {
          const blobRes = await fetch(s.url);
          if (!blobRes.ok) throw new Error(`Couldn't download sticker ${i + 1} of ${total}.`);
          const blob = await blobRes.blob();
          const ext = s.video ? "webm" : "webp";
          const path = `stickers/${tag}/${s.id}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(MEME_VAULT_BUCKET)
            .upload(path, blob, { upsert: true, contentType: s.video ? "video/webm" : (blob.type || "image/webp") });
          if (upErr) throw upErr;
          const publicUrl = supabase.storage.from(MEME_VAULT_BUCKET).getPublicUrl(path).data.publicUrl;
          const { error: insErr } = await supabase.from("memes").insert({
            url: publicUrl,
            tags: [tag, s.emoji].filter(Boolean),
            category: "stickers",
          });
          if (insErr) throw insErr;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn't save one of the stickers.");
          break;
        }
        done++;
        setImported(done);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
    setImporting(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        icon={<Send className="h-5 w-5" />}
        title="Telegram not connected"
        body="Add your Supabase keys to save stickers to the vault."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && fetchPack()}
          placeholder="t.me/addstickers/PackName"
          className="h-11 min-w-0 flex-1 rounded-xl border border-edge bg-surface-2 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
        />
        <Button size="md" onClick={() => void fetchPack()} loading={loading} disabled={!link.trim()}>
          <Send className="h-4 w-4" />
          Fetch
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Paste any Telegram sticker pack link. Every sticker lands in your vault as a WebP — ready to
        react with.
      </p>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm text-red-200">{error}</p>
            {hint && <p className="mt-1 text-xs text-red-300/80">{hint}</p>}
          </div>
        </div>
      )}

      {pack && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-100">{pack.title}</p>
              <p className="text-xs text-zinc-500">
                {pack.count} stickers
                {imported > 0 && <span className="text-accent"> · {imported} saved</span>}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void importAll()} loading={importing} disabled={imported > 0}>
              <Download className="h-3.5 w-3.5" />
              {imported > 0 ? "Saved" : "Add all to vault"}
            </Button>
          </div>

          <div className="grid max-h-72 grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 overflow-y-auto">
            {pack.stickers.map((s) => (
              <button
                key={s.id}
                onClick={() => onPick?.({ kind: "upload", url: s.url, tag: s.emoji || "telegram", width: s.width, height: s.height })}
                className="group relative isolate aspect-square overflow-hidden rounded-lg border border-edge bg-surface-2 active:opacity-80"
              >
                <MemeImage src={s.url} alt="" sizes="110px" />
                <span className="absolute left-1 top-1 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm">{s.emoji}</span>
                {onPick && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/45 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-zinc-950">Use</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {importing && (
        <p className="flex items-center gap-2 text-center text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving stickers… {imported}/{pack?.count}
        </p>
      )}
    </div>
  );
}

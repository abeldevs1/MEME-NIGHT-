"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Search, Trash2 } from "lucide-react";
import { isSupabaseConfigured, removeMeme, requireSupabase } from "@/lib/supabase/client";
import type { MemeSource, VaultMeme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MemeImage } from "@/components/ui/meme-image";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "local", label: "Local" },
  { key: "stickers", label: "Stickers" },
  { key: "giphy", label: "GIFs" },
  { key: "global", label: "Global" },
  { key: "general", label: "General" },
];

interface VaultBrowserProps {
  onSelect?: (meme: MemeSource) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const PAGE = 48;

export function VaultBrowser({ onSelect, onDelete, className }: VaultBrowserProps) {
  const [category, setCategory] = useState("all");
  const [tagQuery, setTagQuery] = useState("");
  const [memes, setMemes] = useState<VaultMeme[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const load = async (reset: boolean) => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = requireSupabase();
    const offset = reset ? 0 : offsetRef.current;
    let query = supabase
      .from("memes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (category !== "all") query = query.eq("category", category);
    const tag = tagQuery.trim();
    if (tag) query = query.contains("tags", [tag]);
    const { data, error } = await query;
    if (error) return;
    offsetRef.current = offset + (data?.length ?? 0);
    setHasMore((data?.length ?? 0) >= PAGE);
    setMemes(reset ? (data as VaultMeme[]) : (prev) => {
      const byId = new Map(prev.map(m => [m.id, m]));
      for (const m of (data as VaultMeme[])) {
        byId.set(m.id, m);
      }
      return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
  };

  useEffect(() => {
    setLoading(true);
    offsetRef.current = 0;
    void load(true).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, tagQuery]);

  const handleDelete = async (meme: VaultMeme) => {
    if (deletingId === meme.id) {
      setDeletingId(null);
      try {
        await removeMeme(meme.id, meme.url);
        onDelete?.(meme.id);
        setMemes((prev) => prev.filter((m) => m.id !== meme.id));
      } catch (e) {
        console.error("delete failed", e);
      }
      return;
    }
    setDeletingId(meme.id);
    setTimeout(() => setDeletingId((id) => (id === meme.id ? null : id)), 6000);
  };

  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        icon={<ImageOff className="h-5 w-5" />}
        title="Vault not connected"
        body="Add your Supabase keys to load the meme vault."
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                category === c.key
                  ? "bg-accent text-zinc-950"
                  : "bg-surface-2 text-zinc-400 hover:text-zinc-200 border border-edge",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={tagQuery}
          onChange={(e) => setTagQuery(e.target.value)}
          placeholder="Filter by tag"
          className="h-10 w-full rounded-xl border border-edge bg-surface-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : memes.length === 0 ? (
        <EmptyState
          icon={<ImageOff className="h-5 w-5" />}
          title="Nothing here yet"
          body="Upload memes, or paste a Telegram sticker pack link, to fill the vault."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
          {memes.map((meme) => (
            <VaultCell
              key={meme.id}
              meme={meme}
              onSelect={onSelect}
              deleting={deletingId === meme.id}
              onDelete={onDelete ? () => void handleDelete(meme) : undefined}
            />
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <Button variant="outline" size="sm" className="mx-auto" onClick={() => void load(false)}>
          Load more
        </Button>
      )}
    </div>
  );
}

function VaultCell({
  meme,
  onSelect,
  onDelete,
  deleting,
}: {
  meme: VaultMeme;
  onSelect?: (m: MemeSource) => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-edge bg-surface-2 transition-transform active:scale-95">
      {onSelect ? (
        <button
          onClick={() => onSelect({ kind: "vault", url: meme.url, id: meme.id, tag: meme.category, category: meme.category })}
          aria-label="Pick meme"
          className="absolute inset-0 h-full w-full"
        >
          <MemeImage src={meme.url} alt="" sizes="20vw" />
          {meme.tags.length > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm">
              {meme.tags[0]}
            </span>
          )}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/45 transition-opacity group-hover:bg-zinc-950/60">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-zinc-950">Pick</span>
          </span>
        </button>
      ) : (
        <>
          <MemeImage src={meme.url} alt="" sizes="20vw" />
          {meme.tags.length > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm">
              {meme.tags[0]}
            </span>
          )}
        </>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={deleting ? "Confirm delete" : "Delete meme"}
          title={deleting ? "Tap again to confirm" : "Delete meme"}
          className={cn(
            "absolute bottom-1.5 right-1.5 z-10 flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-sm transition-colors",
            deleting ? "bg-red-500 text-white" : "bg-zinc-950/70 text-zinc-300 hover:bg-red-500/90 hover:text-white",
          )}
        >
          {deleting ? (
            "Delete?"
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-edge-2 px-6 py-10 text-center">
      <div className="text-zinc-500">{icon}</div>
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      <p className="text-xs text-zinc-500">{body}</p>
    </div>
  );
}

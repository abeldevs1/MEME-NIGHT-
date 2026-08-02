"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Check, Loader2, Search, SearchX } from "lucide-react";
import { isGiphyConfigured, QUICK_TAGS, searchGiphy, trendingGiphy } from "@/lib/giphy";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase/client";
import type { GiphyResult, MemeSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MemeImage } from "@/components/ui/meme-image";
import { EmptyState } from "@/components/vault-browser";

interface GiphySearchProps {
  onSelect?: (meme: MemeSource) => void;
}

export function GiphySearch({ onSelect }: GiphySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveGif = async (r: GiphyResult) => {
    if (!isSupabaseConfigured) return;
    try {
      const supabase = requireSupabase();
      const tags = query.trim() ? [query.trim()] : [];
      const { error: insErr } = await supabase
        .from("memes")
        .insert({ url: r.gif.url, tags, category: "giphy" });
      if (!insErr) setSavedIds((prev) => new Set(prev).add(r.id));
    } catch (e) {
      console.error("save gif failed", e);
    }
  };

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setResults(await trendingGiphy());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await searchGiphy({ q, limit: 25 });
      setResults(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isGiphyConfigured()) {
      setLoading(false);
      return;
    }
    void loadTrending();
  }, [loadTrending]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = value.trim();
      if (q) void runSearch(q);
      else void loadTrending();
    }, 600);
  };

  const onQuickTag = (tag: string) => {
    setQuery(tag);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runSearch(tag);
  };

  if (!isGiphyConfigured()) {
    return (
      <EmptyState
        icon={<SearchX className="h-5 w-5" />}
        title="Giphy not connected"
        body="Add NEXT_PUBLIC_GIPHY_API_KEY to search GIFs."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => onQuickTag(tag)}
            className={cn(
              "shrink-0 rounded-full border border-edge bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-accent/50 hover:text-accent",
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search Giphy…"
          className="h-10 w-full rounded-xl border border-edge bg-surface-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-xs">Fetching memes…</p>
        </div>
      ) : error ? (
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="Giphy hiccup"
          body="Couldn't reach Giphy. Check your API key and try again."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
          {results.map((r) => (
            <div
              key={r.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-edge bg-surface-2 transition-transform active:scale-95"
            >
              <button
                onClick={() =>
                  onSelect?.({ kind: "giphy", url: r.gif.url, id: r.id, tag: r.title, width: r.gif.dims[0], height: r.gif.dims[1] })
                }
                aria-label="Pick GIF"
                className="absolute inset-0 h-full w-full"
              >
                <MemeImage src={r.tinygif.preview || r.tinygif.url} alt={r.title || ""} sizes="130px" />
                {onSelect && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/45 transition-opacity group-hover:bg-zinc-950/60">
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-zinc-950">Pick</span>
                  </span>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void saveGif(r);
                }}
                aria-label="Save GIF to vault"
                className={cn(
                  "absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
                  savedIds.has(r.id)
                    ? "bg-accent text-zinc-950"
                    : "bg-zinc-950/70 text-zinc-300 hover:bg-accent hover:text-zinc-950",
                )}
              >
                {savedIds.has(r.id) ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="No results"
              body="Try a different search."
            />
          )}
        </div>
      )}
    </div>
  );
}

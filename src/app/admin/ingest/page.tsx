"use client";

import { Check, ImagePlus, Loader2, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { MemeImage } from "@/components/ui/meme-image";
import { MEME_VAULT_BUCKET, getPublicVaultUrl, isSupabaseConfigured, removeMeme, requireSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "local", label: "Local" },
  { key: "stickers", label: "Stickers" },
  { key: "global", label: "Global" },
  { key: "general", label: "General" },
];

type ItemStatus = { name: string; status: "uploading" | "ok" | "error"; url?: string; id?: string };

export default function IngestPage() {
  const [category, setCategory] = useState("local");
  const [tags, setTags] = useState("");
  const [items, setItems] = useState<ItemStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const okCount = items.filter((i) => i.status === "ok").length;

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) {
      setError("Supabase isn't configured. Add your keys to .env.local first.");
      return;
    }
    const supabase = requireSupabase();
    setBusy(true);
    setError("");
    setDone(false);

    const list = Array.from(files);
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const base = [...items];
    setItems([...base, ...list.map((f) => ({ name: f.name, status: "uploading" as const }))]);

    const results = await Promise.all(
      list.map(async (file, i) => {
        const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `ingest/${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
        try {
          const { error: upErr } = await supabase.storage
            .from(MEME_VAULT_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
          if (upErr) throw upErr;
          const url = getPublicVaultUrl(path);
          const { data: insData, error: insErr } = await supabase
            .from("memes")
            .insert({ url, tags: tagList, category })
            .select("id")
            .single();
          if (insErr) throw insErr;
          return { name: file.name, status: "ok" as const, url, id: insData?.id };
        } catch (e) {
          console.error("ingest failed", e);
          return { name: file.name, status: "error" as const };
        }
      }),
    );

    setItems((prev) => {
      const next = [...prev];
      results.forEach((r, i) => {
        next[base.length + i] = r;
      });
      return next;
    });
    setDone(true);
    setBusy(false);
  };

  const reset = () => {
    setItems([]);
    setTags("");
    setDone(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (item: ItemStatus) => {
    if (item.status !== "ok" || !item.id || !item.url) return;
    try {
      await removeMeme(item.id, item.url);
    } catch (e) {
      console.error("remove failed", e);
    }
    setItems((prev) => prev.filter((x) => x !== item));
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-4">
        <Brand size="sm" />
        <Link href="/" className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-200">
          Back
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-5 py-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50">Fill the vault</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Bulk-upload meme images and stickers. They show up in the game's vault instantly.
          </p>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void uploadFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-edge-2 px-6 py-10 text-center transition-colors hover:border-accent/50"
        >
          <Upload className="h-7 w-7 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-200">Drop images here or tap to browse</p>
          <p className="text-xs text-zinc-500">PNG, JPG, WebP, GIF — many files at once</p>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />

        <div className="flex flex-col gap-2 rounded-2xl border border-edge bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Category</p>
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  category === c.key
                    ? "bg-accent text-zinc-950"
                    : "bg-surface-2 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-500" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="habesha, reaction, local"
            className="h-10 w-full rounded-xl border border-edge bg-surface-2 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
          />
        </div>

        <div className="rounded-2xl border border-edge bg-surface-2 p-4 text-xs leading-relaxed text-zinc-500">
          <p className="flex items-center gap-2 font-semibold text-zinc-300">
            <ImagePlus className="h-4 w-4" />
            Telegram sticker packs
          </p>
          <p className="mt-1.5">
            Export sticker packs as WebP or PNG from a Telegram sticker bot, then drop the files here.
            Animated <code className="rounded bg-zinc-950/40 px-1">.tgs</code> files aren't supported —
            grab the static WebP versions.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                {okCount} of {items.length} in
              </p>
              {!busy && items.length > 0 && (
                <button onClick={reset} className="text-xs font-semibold text-zinc-500 hover:text-zinc-200">
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-edge bg-surface p-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                  {item.status === "ok" && item.url ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-edge">
                      <MemeImage src={item.url} alt="" sizes="40px" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-edge">
                      {item.status === "uploading" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      ) : item.status === "error" ? (
                        <X className="h-4 w-4 text-red-400" />
                      ) : (
                        <Check className="h-4 w-4 text-accent" />
                      )}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{item.name}</span>
                  <span className="text-xs text-zinc-500">
                    {item.status === "uploading"
                      ? "uploading"
                      : item.status === "error"
                        ? "failed"
                        : "done"}
                  </span>
                  {item.status === "ok" && (
                    <button
                      onClick={() => void remove(item)}
                      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {done && okCount > 0 && (
          <div className="rounded-2xl border border-accent/40 bg-accent-dim p-4 text-sm text-zinc-200">
            <p className="font-semibold text-accent">{okCount} memes added to the vault</p>
            <p className="mt-1 text-zinc-400">They're live in the game's meme picker now.</p>
          </div>
        )}
      </div>
    </main>
  );
}

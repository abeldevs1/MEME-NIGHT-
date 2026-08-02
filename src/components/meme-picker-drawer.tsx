"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, Flame, Loader2, Send, Upload, X, ImagePlus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { isGiphyConfigured } from "@/lib/giphy";
import type { MemeSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GiphySearch } from "@/components/giphy-search";
import { TelegramStickers } from "@/components/telegram-stickers";
import { VaultBrowser } from "@/components/vault-browser";
import { Button } from "@/components/ui/button";
import { MemeImage } from "@/components/ui/meme-image";
import { MEME_VAULT_BUCKET, getPublicVaultUrl, isSupabaseConfigured, requireSupabase } from "@/lib/supabase/client";

type TabId = "giphy" | "vault" | "upload" | "telegram";

interface MemePickerDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (meme: MemeSource) => void;
}

export function MemePickerDrawer({ open, onClose, onSelect }: MemePickerDrawerProps) {
  const [tab, setTab] = useState<TabId>(isGiphyConfigured() ? "giphy" : "vault");

  const pick = useCallback(
    (meme: MemeSource) => {
      onClose(); // close immediately so the UI feels instant
      onSelect(meme); // submit in the background
    },
    [onSelect, onClose],
  );

  const tabs: { id: TabId; label: string; icon: typeof Flame }[] = [
    { id: "giphy", label: "Search", icon: Flame },
    { id: "vault", label: "Vault", icon: Bookmark },
    { id: "telegram", label: "Telegram", icon: Send },
    { id: "upload", label: "Upload", icon: ImagePlus },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-edge bg-surface pb-safe"
          >
            <div className="flex items-center justify-between px-5 pt-3">
              <div className="flex flex-col">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge-2" />
                <h2 className="font-display text-base font-bold">Pick a Meme</h2>
              </div>
              <button
                onClick={onClose}
                className="-mr-2 rounded-full p-2 text-zinc-400 hover:bg-surface-2 hover:text-zinc-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 px-5 pt-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    tab === t.id ? "bg-accent text-zinc-950" : "bg-surface-2 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex-1 overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {tab === "giphy" && <GiphySearch onSelect={pick} />}
                  {tab === "vault" && <VaultBrowser onSelect={pick} onDelete={undefined} />}
                  {tab === "telegram" && <TelegramStickers onPick={pick} />}
                  {tab === "upload" && <UploadTab onPick={pick} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function UploadTab({ onPick }: { onPick: (meme: MemeSource) => void }) {
  const [items, setItems] = useState<{ name: string; status: "uploading" | "ok" | "error"; url?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compresses image to webp using a canvas to save storage space
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height *= MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width *= MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas to Blob failed"));
          },
          "image/webp",
          0.7 // 70% quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load error"));
      };
      img.src = url;
    });
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) return;
    const supabase = requireSupabase();
    setBusy(true);
    const list = Array.from(files);
    const newItems = list.map((f) => ({ name: f.name, status: "uploading" as const }));
    setItems((prev) => [...prev, ...newItems]);

    await Promise.all(
      list.map(async (file, i) => {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}.webp`;
        try {
          // Compress the image before uploading to save Supabase space
          const compressedBlob = await compressImage(file);
          const { error } = await supabase.storage
            .from(MEME_VAULT_BUCKET)
            .upload(path, compressedBlob, { upsert: false, contentType: "image/webp" });
          if (error) throw error;
          const url = getPublicVaultUrl(path);
          await supabase.from("memes").insert({ url, tags: [], category: "local" });
          setItems((prev) => {
            const next = [...prev];
            const idx = prev.length - list.length + i;
            next[idx] = { name: file.name, status: "ok", url };
            return next;
          });
        } catch (e) {
          console.error("upload failed", e);
          setItems((prev) => {
            const next = [...prev];
            const idx = prev.length - list.length + i;
            next[idx] = { name: file.name, status: "error" };
            return next;
          });
        }
      }),
    );
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void uploadFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-edge-2 px-6 py-8 text-center transition-colors hover:border-accent/50"
      >
        <Upload className="h-6 w-6 text-zinc-500" />
        <p className="text-sm font-semibold text-zinc-200">Drop images here or tap to browse</p>
        <p className="text-xs text-zinc-500">PNG, JPG, WebP, GIF. Sticker packs work great.</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void uploadFiles(e.target.files)}
      />

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-edge bg-surface-2 p-2.5">
              {item.status === "ok" && item.url ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-edge">
                  <MemeImage src={item.url} alt="" sizes="48px" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-edge">
                  {item.status === "uploading" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : item.status === "error" ? (
                    <X className="h-4 w-4 text-red-400" />
                  ) : (
                    <Check className="h-4 w-4 text-accent" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{item.name}</p>
                <p className="text-xs text-zinc-500">
                  {item.status === "uploading"
                    ? "Uploading…"
                    : item.status === "error"
                      ? "Upload failed"
                      : "In your vault"}
                </p>
              </div>
              {item.status === "ok" && item.url && (
                <Button size="sm" variant="outline" onClick={() => onPick({ kind: "upload", url: item.url! })}>
                  Use this
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {busy && <p className="text-center text-xs text-zinc-500">Hold on, uploading…</p>}
    </div>
  );
}

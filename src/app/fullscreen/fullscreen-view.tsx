"use client";

import { Maximize, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MemeImage } from "@/components/ui/meme-image";

interface FullScreenViewProps {
  url: string;
  title?: string;
}

export function FullScreenView({ url, title }: FullScreenViewProps) {
  const router = useRouter();
  const [isFs, setIsFs] = useState(false);

  const onFsChange = useCallback(() => setIsFs(Boolean(document.fullscreenElement)), []);
  useEffect(() => {
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onFsChange]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  };

  if (!url) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold text-zinc-100">No meme to show</p>
        <button onClick={() => router.back()} className="text-sm text-zinc-500 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <p className="truncate pr-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {title || "meme night"}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={toggleFullscreen}
            className="rounded-full bg-zinc-900/90 p-2.5 text-zinc-200 active:scale-95"
            aria-label="Toggle fullscreen"
          >
            <Maximize className="h-5 w-5" />
          </button>
          <button
            onClick={() => (isFs ? void document.exitFullscreen?.() : router.back())}
            className="rounded-full bg-zinc-900/90 p-2.5 text-zinc-200 active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 p-2">
        <MemeImage src={url} alt={title || ""} fit="contain" sizes="100vw" />
      </div>
    </div>
  );
}

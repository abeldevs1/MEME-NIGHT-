"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { normalizeVaultUrl } from "@/lib/supabase/client";
import { cn, isGifUrl } from "@/lib/utils";

function isProxyUrl(src: string) {
  return src.startsWith("/api/stickers/proxy");
}

interface MemeImageProps {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
}

/** Fills its parent. Good for small, uniform grid cells. */
export function MemeImage({
  src,
  alt = "",
  className,
  sizes = "20vw",
  priority = false,
  fit = "cover",
}: MemeImageProps) {
  // Animated content (Telegram stickers via proxy, GIFs) needs a dedicated GPU
  // compositing layer to avoid flickering on mobile. Without this, the browser
  // repaints animated frames on the main thread — causing the glitch that
  // disappears when DevTools opens (which forces a repaint/layer promotion).
  const isAnimated = isGifUrl(src) || isProxyUrl(src);

  return (
    <Image
      src={normalizeVaultUrl(src)}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      unoptimized={isAnimated}
      style={isAnimated ? { willChange: "transform", transform: "translateZ(0)" } : undefined}
    />
  );
}

interface SmartMemeProps {
  src: string;
  alt?: string;
  className?: string;
  maxHeight?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  eager?: boolean;
}

/**
 * Renders a meme at its natural aspect ratio and intrinsic size, only ever
 * scaling DOWN to fit the available space (`maxHeight` + full width). Small
 * stickers and GIFs stay small instead of blowing up into the whole screen.
 * If you already know the pixel dimensions (e.g. Telegram stickers), pass
 * `width`/`height` to avoid a layout jump.
 */
export function SmartMeme({
  src,
  alt = "",
  className,
  maxHeight,
  width,
  height,
  priority = false,
  eager = false,
}: SmartMemeProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(Boolean(width && height));

  useEffect(() => {
    setLoaded(Boolean(width && height));
    setFailed(false);
  }, [src, width, height]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-28 w-full items-center justify-center rounded-2xl bg-surface-2 text-xs text-zinc-600",
          className,
        )}
      >
        sticker got away 😢
      </div>
    );
  }

  const isAnimated = isGifUrl(src) || isProxyUrl(src);
  const isVideo = src.toLowerCase().endsWith(".webm") || src.toLowerCase().endsWith(".mp4") || src.includes(".webm?");
  const finalSrc = normalizeVaultUrl(src);
  const classNames = cn(
    "max-w-full max-h-full object-contain transition-opacity duration-200",
    !loaded && "opacity-0",
  );

  return (
    <div className={cn("flex w-full items-center justify-center overflow-hidden", maxHeight, className)}>
      {isVideo ? (
        <video
          src={finalSrc}
          width={width}
          height={height}
          autoPlay
          loop
          muted
          playsInline
          className={classNames}
          onLoadedData={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          src={finalSrc}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? "eager" : "lazy"}
          className={classNames}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={isAnimated ? { willChange: "transform", transform: "translateZ(0)" } : undefined}
        />
      )}
    </div>
  );
}

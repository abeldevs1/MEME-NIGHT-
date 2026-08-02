"use client";

import { cn } from "@/lib/utils";

interface CaptionCardProps {
  text: string;
  selected?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  rotate?: number;
  className?: string;
}

const ROTATIONS = [-2, -1, 1, 2, 0];

export function CaptionCard({
  text,
  selected = false,
  dimmed = false,
  disabled = false,
  onClick,
  rotate = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)],
  className,
}: CaptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "card-sticker relative w-full rounded-xl border bg-[#fdf6e3] px-4 py-4 text-left shadow-md transition-all",
        selected && "border-accent ring-2 ring-accent",
        dimmed && "opacity-45",
        !disabled && onClick && "hover:-translate-y-0.5 active:scale-[0.98]",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span
        className={cn(
          "font-display text-sm font-bold leading-snug text-stone-900",
          text.length > 48 && "text-[13px]",
        )}
      >
        {text}
      </span>
    </button>
  );
}

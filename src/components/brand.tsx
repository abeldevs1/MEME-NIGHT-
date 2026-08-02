import { Laugh } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-stone-950 shadow-[0_0_18px_rgba(190,242,100,0.35)]">
        <Laugh className="h-4 w-4" />
      </div>
      <span
        className={cn(
          "font-display font-extrabold tracking-tight text-stone-50",
          size === "md" ? "text-lg" : "text-sm",
        )}
      >
        meme night
        <span className="text-accent">.</span>
      </span>
    </div>
  );
}

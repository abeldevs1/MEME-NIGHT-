"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-zinc-950 hover:bg-accent-strong shadow-[0_0_0_1px_rgba(163,230,53,0.4)]",
  outline: "border border-edge-2 text-zinc-100 hover:border-zinc-500 hover:bg-surface-2",
  ghost: "text-zinc-300 hover:bg-surface hover:text-zinc-100",
  subtle: "bg-surface-2 text-zinc-200 hover:bg-edge border border-edge",
  danger: "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
  xl: "h-14 px-6 text-base gap-2.5 rounded-2xl",
};

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, block, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "inline-flex select-none items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          block && "w-full",
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";

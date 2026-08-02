"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NameModalProps {
  open: boolean;
  initialValue?: string;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
}

export function NameModal({
  open,
  initialValue = "",
  title = "What's your name?",
  subtitle = "Your name shows on the leaderboard.",
  submitLabel = "Enter",
  onSubmit,
}: NameModalProps) {
  const [name, setName] = useState(initialValue);

  const submit = () => {
    const clean = name.trim();
    if (clean) onSubmit(clean);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/80 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl border-t border-edge bg-surface p-6 pb-safe sm:max-w-sm sm:rounded-3xl sm:border"
          >
            <h2 className="text-lg font-bold text-zinc-50">{title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              maxLength={16}
              placeholder="e.g. Bini"
              className="mt-4 h-12 w-full rounded-xl border border-edge bg-surface-2 px-4 text-base font-medium text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none"
            />
            <Button block size="lg" className="mt-4" onClick={submit} disabled={!name.trim()}>
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

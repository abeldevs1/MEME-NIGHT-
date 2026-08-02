"use client";

import { motion } from "framer-motion";
import { ArrowRight, LogIn, MonitorPlay, Play, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/hooks/use-player";
import { randomRoomCode } from "@/lib/utils";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const me = usePlayer();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured;

  const createRoom = async () => {
    if (!configured) return;
    setCreating(true);
    setError("");
    const supabase = requireSupabase();
    try {
      const playerId = me.playerId;
      for (let attempt = 0; attempt < 4; attempt++) {
        const roomCode = randomRoomCode();
        const { error } = await supabase.from("rooms").insert({
          code: roomCode,
          host_id: playerId,
          host_name: me.name || "Host",
          status: "lobby",
          current_prompt: null,
          round_number: 0,
        });
        if (!error) {
          router.push(`/room/${roomCode}`);
          return;
        }
        if (error.code !== "23505") {
          setError(error.message);
          break;
        }
      }
      setError("Couldn't grab a fresh code. Try again.");
    } catch {
      setError("Something broke. Check your Supabase config.");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = () => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length >= 3) {
      router.push(`/room/${clean}/play`);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-safe pt-safe">
      <header className="flex items-center justify-between py-4">
        <Brand />
        <a
          href="/admin/ingest"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-200"
        >
          Fill the vault
        </a>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent">Pass the phone</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-zinc-50">
            React with memes.
            <br />
            <span className="text-accent">Laugh forever.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            A party game where everyone answers a prompt with the perfect meme. In person or online —
            no sign-ups, just chaos.
          </p>
        </motion.div>

        {!configured && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="text-sm text-amber-200">
              <p className="font-semibold">Supabase isn't connected yet.</p>
              <p className="mt-1 text-amber-300/80">
                Copy <code className="rounded bg-zinc-950/40 px-1">.env.local.example</code> to{" "}
                <code className="rounded bg-zinc-950/40 px-1">.env.local</code>, add your keys, then run{" "}
                <code className="rounded bg-zinc-950/40 px-1">npm run dev</code>.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          >
            <Button
              block
              size="xl"
              onClick={createRoom}
              loading={creating}
              disabled={!configured}
            >
              <Play className="h-5 w-5" />
              Create Room
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                placeholder="CODE"
                className="h-14 w-full rounded-2xl border border-edge bg-surface px-4 text-center text-xl font-bold uppercase tracking-[0.3em] text-zinc-100 placeholder:text-zinc-600 focus:border-accent/60 focus:outline-none"
              />
              {code.length >= 3 && (
                <button
                  onClick={joinRoom}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-accent text-zinc-950"
                  aria-label="Join room"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
          >
            <Button block size="xl" variant="outline" onClick={joinRoom} disabled={code.length < 3}>
              <LogIn className="h-5 w-5" />
              Join Room
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32, ease: "easeOut" }}
          >
            <Button block size="lg" variant="ghost" onClick={() => router.push("/display")}>
              <MonitorPlay className="h-4 w-4" />
              Just show memes — no rooms
            </Button>
          </motion.div>
        </div>

        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
      </div>

      <footer className="py-6 text-center text-xs text-zinc-600">
        meme night — bring the memes, win the night
      </footer>
    </main>
  );
}

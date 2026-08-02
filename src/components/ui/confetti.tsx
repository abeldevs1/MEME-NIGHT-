"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#a3e635", "#fbbf24", "#f472b6", "#22d3ee", "#a78bfa", "#fb923c", "#f97316"];

/** A short canvas confetti burst. Re-trigger by bumping `burst`. */
export function ConfettiBurst({ burst }: { burst: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!burst) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      w: 6 + Math.random() * 7,
      h: 10 + Math.random() * 10,
      vx: (Math.random() - 0.5) * 3.5,
      vy: 2.5 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      sway: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let start: number | null = null;
    const duration = 2800;

    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx + Math.sin(elapsed / 350 + p.sway) * 0.7;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [burst]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[80]" aria-hidden />;
}

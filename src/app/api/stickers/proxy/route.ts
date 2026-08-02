import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/** Streams a Telegram sticker file through the server so the bot token never leaks. */
export async function GET(req: NextRequest) {
  const f = req.nextUrl.searchParams.get("f");
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !f) {
    return new Response("missing params", { status: 400 });
  }
  try {
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${f}`, { cache: "no-store" });
    if (!res.ok) return new Response("upstream error", { status: 502 });
    const body = await res.arrayBuffer();
    return new Response(body, {
      headers: {
        "content-type": res.headers.get("content-type") ?? "image/webp",
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("proxy failed", { status: 502 });
  }
}

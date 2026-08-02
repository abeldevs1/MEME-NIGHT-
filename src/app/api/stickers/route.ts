import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const CONCURRENCY = 6;

function parsePack(input: string): string {
  const raw = input.trim();
  const m = raw.match(/addstickers\/([A-Za-z0-9_]+)/);
  const name = (m ? m[1] : raw).replace(/[^A-Za-z0-9_]/g, "");
  return name;
}

async function tgGetFile(token: string, fileId: string): Promise<string | null> {
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.ok || !data.result?.file_path) return null;
  return data.result.file_path as string;
}

/** A dead/revoked bot token makes EVERY bot method return 404, which is easy to
 * misread as "pack not found". Confirm the token works up front with getMe. */
async function tokenIsValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let idx = 0;
  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

interface TelegramSticker {
  file_id: string;
  emoji?: string;
  width?: number;
  height?: number;
  is_animated?: boolean;
  is_video?: boolean;
  thumb?: { file_id?: string };
}

export async function GET(req: NextRequest) {
  const pack = parsePack(req.nextUrl.searchParams.get("pack") ?? "");
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!pack) {
    return NextResponse.json(
      { ok: false, error: "Send a sticker pack link like https://t.me/addstickers/NAME" },
      { status: 400 },
    );
  }
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_token",
        hint: "Add TELEGRAM_BOT_TOKEN to .env.local to import sticker packs.",
      },
      { status: 400 },
    );
  }

  if (!(await tokenIsValid(token))) {
    return NextResponse.json(
      {
        ok: false,
        error: "bad_token",
        hint: "Your TELEGRAM_BOT_TOKEN is no longer valid. Open @BotFather, run /token (or /newbot), and paste the fresh token into .env.local, then restart the dev server.",
      },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getStickerSet?name=${encodeURIComponent(pack)}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!data.ok) {
      const code = (data.error_code as number) ?? res.status;
      if (code === 401) {
        return NextResponse.json(
          {
            ok: false,
            error: "bad_token",
            hint: "Your TELEGRAM_BOT_TOKEN looks wrong. Open @BotFather, run /token, and paste the full `123456789:ABC…` string into .env.local.",
          },
          { status: 400 },
        );
      }
      if (code === 404) {
        return NextResponse.json(
          {
            ok: false,
            error: "That sticker pack wasn't found. Double-check the link (https://t.me/addstickers/NAME) and that the bot can see it.",
          },
          { status: 404 },
        );
      }
      const desc = (data.description as string) || "That pack couldn't be found.";
      return NextResponse.json({ ok: false, error: desc }, { status: 404 });
    }

    const set = data.result;
    const stickers = (set.stickers ?? []) as TelegramSticker[];

    const paths = await mapWithConcurrency(stickers, CONCURRENCY, async (st) => {
      const useThumb = st.is_animated; // Lottie (.tgs) needs thumb. Video (.webm) is supported natively!
      const fileId = useThumb ? st.thumb?.file_id ?? null : st.file_id;
      const filePath = fileId ? await tgGetFile(token, fileId) : null;
      return {
        id: st.file_id,
        filePath,
        emoji: st.emoji ?? "",
        width: st.width ?? 512,
        height: st.height ?? 512,
        animated: Boolean(st.is_animated),
        video: Boolean(st.is_video),
      };
    });

    const list = paths
      .filter((p) => p.filePath)
      .map((p) => ({
        id: p.id,
        emoji: p.emoji,
        width: p.width,
        height: p.height,
        animated: p.animated,
        video: p.video,
        url: `/api/stickers/proxy?f=${encodeURIComponent(p.filePath!)}`,
      }));

    return NextResponse.json({
      ok: true,
      name: (set.name as string) ?? pack,
      title: (set.title as string) ?? pack,
      count: list.length,
      stickers: list,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Telegram is being grumpy. Try again in a sec." }, { status: 502 });
  }
}

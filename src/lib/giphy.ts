import type { GiphyResult } from "./types";

const GIPHY_API = "https://api.giphy.com/v1";
const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

export const QUICK_TAGS = [
  "Habesha",
  "African Parents",
  "Shocked",
  "Laughing",
  "Side Eye",
  "Seifu",
  "Drama",
];

export function isGiphyConfigured() {
  return Boolean(API_KEY);
}

function dimsOf(img: { width?: string; height?: string } | undefined): [number, number] {
  return [
    Number.parseInt(img?.width ?? "", 10) || 200,
    Number.parseInt(img?.height ?? "", 10) || 200,
  ];
}

function normalizeGiphyResult(raw: any): GiphyResult | null {
  const images = raw?.images ?? {};
  const small = images.fixed_width_small ?? images.downsized_small;
  const full = images.fixed_width ?? images.downsized_medium ?? images.original;
  if (!small?.url && !full?.url) return null;
  const preview = images.preview_webp?.url ?? images.preview_gif?.url ?? small?.url ?? "";
  const url = full?.url ?? small?.url ?? "";
  return {
    id: String(raw.id),
    title: raw.title ?? "",
    url: raw.url ?? "",
    gif: { url, dims: dimsOf(full ?? small), preview, size: 0 },
    tinygif: {
      url: small?.url ?? url,
      dims: dimsOf(small ?? full),
      preview,
      size: 0,
    },
    webp: images.fixed_width_webp ?? { url: "", dims: [0, 0], size: 0 },
    preview,
  };
}

async function giphyFetch(path: string, params: Record<string, string | number>): Promise<GiphyResult[]> {
  if (!API_KEY) throw new Error("Giphy API key is not configured.");
  const search = new URLSearchParams({
    api_key: API_KEY,
    rating: "g",
    lang: "en",
    limit: "25",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${GIPHY_API}${path}?${search.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Giphy request failed (${res.status})`);
  const data = await res.json();
  return (data.data ?? []).map(normalizeGiphyResult).filter(Boolean) as GiphyResult[];
}

export interface GiphySearchParams {
  q: string;
  limit?: number;
}

export async function searchGiphy({ q, limit = 25 }: GiphySearchParams): Promise<GiphyResult[]> {
  return giphyFetch("/gifs/search", { q, limit });
}

export async function trendingGiphy(limit = 25): Promise<GiphyResult[]> {
  return giphyFetch("/gifs/trending", { limit });
}

export async function suggestGiphy(q: string): Promise<string[]> {
  if (!API_KEY) return [];
  const search = new URLSearchParams({ api_key: API_KEY, term: q, limit: "8" });
  const res = await fetch(`${GIPHY_API}/gifs/search/tags?${search.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).map((r: any) => r.name).filter(Boolean);
}

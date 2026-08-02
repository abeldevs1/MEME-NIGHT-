"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export const MEME_VAULT_BUCKET = "meme-vault";

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export function getPublicVaultUrl(path: string) {
  if (!supabase) return "";
  return supabase.storage.from(MEME_VAULT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Some vault rows get saved with the non-public storage URL
 * (`/storage/v1/object/<bucket>/...`), which 401s in the browser. Rewrite any
 * of our vault object URLs to the public form so the image actually loads.
 */
export function normalizeVaultUrl(url: string) {
  if (!url || !supabaseUrl) return url;
  const m = url.match(/^(.+\/storage\/v1\/object\/)(?!public\/)([^/]+\/.+)$/i);
  if (m) return `${m[1]}public/${m[2]}`;
  return url;
}

export function isVaultUrl(url: string) {
  return url.includes("/storage/v1/object/") && url.includes(MEME_VAULT_BUCKET);
}

/** Extract the object path of a vault file from its public URL. */
export function storagePathFromUrl(url: string) {
  const m = url.match(new RegExp(`/storage/v1/object/(?:public/)?${MEME_VAULT_BUCKET}/(.+)`));
  return m ? m[1] : null;
}

/** Delete a vault file (storage object + `memes` row). */
export async function removeMeme(memeId: string, url: string) {
  const client = requireSupabase();
  const path = storagePathFromUrl(url);
  if (path) {
    const { error: delErr } = await client.storage.from(MEME_VAULT_BUCKET).remove([path]);
    if (delErr) console.warn("storage remove failed", delErr);
  }
  const { error } = await client.from("memes").delete().eq("id", memeId);
  if (error) throw error;
}

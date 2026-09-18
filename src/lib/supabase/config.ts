// Supabase is optional at build time: the credentials are supplied via env
// vars, and until they exist the app runs in guest-only mode rather than
// crashing. Every call site checks `isSupabaseConfigured` first.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** A placeholder in .env.example must not count as configured. */
export function looksLikeRealCredentials(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (url.includes("your-project") || key.includes("your-anon-key")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && key.length > 20;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = looksLikeRealCredentials(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Supabase credentials are read on the server only, from SUPABASE_URL and
// SUPABASE_ANON_KEY — deliberately without a NEXT_PUBLIC_ prefix, so Vercel can
// hold them as private values rather than inlining them into the build.
//
// The browser still needs the URL and anon key to talk to Supabase at all, so
// the server component hands them to <PlayerProvider> as props. What changes is
// *when* and *how* they travel: at request time through the RSC payload, rather
// than baked into the client bundle at build time. That also means rotating a
// key takes effect without a rebuild.
//
// Supabase is optional: until the credentials exist the app runs in guest-only
// mode rather than crashing. Every call site checks `configured` first.

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}

/** A placeholder in .env.example must not count as configured. */
export function looksLikeRealCredentials(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (url.includes("your-project") || key.includes("your-anon-key")) return false;
  // A key with whitespace in it is a paste accident, not a credential.
  if (/\s/.test(key)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && key.length > 20;
  } catch {
    return false;
  }
}

/**
 * Takes the first line only, and trims it.
 *
 * Pasting a multi-line block into a single env var is an easy mistake, and
 * because these values are handed to the browser, a stray second line would be
 * published along with them — which is exactly how a service-role key could
 * leak. Anything after the first newline is dropped and never leaves the
 * server. An embedded newline also makes fetch reject the auth header outright
 * ("Invalid value"), so trimming fixes a real failure as well as a leak.
 */
export function firstLine(value: string): string {
  return value.split(/[\r\n]/, 1)[0].trim();
}

/**
 * Server-side only — reading these on the client yields empty strings, which is
 * the point. Call it from a Server Component, route handler or proxy.
 */
export function readSupabaseEnv(): SupabaseConfig {
  const url = firstLine(process.env.SUPABASE_URL ?? "");
  const anonKey = firstLine(process.env.SUPABASE_ANON_KEY ?? "");
  return { url, anonKey, configured: looksLikeRealCredentials(url, anonKey) };
}

export const UNCONFIGURED: SupabaseConfig = {
  url: "",
  anonKey: "",
  configured: false,
};

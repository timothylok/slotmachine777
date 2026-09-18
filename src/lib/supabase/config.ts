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
// Because the value is published to the browser, this module is deliberately
// strict about what counts as a usable key. Anything it rejects leaves the app
// in guest-only mode, which is a clean, visible failure; a key it wrongly
// accepted would either break at runtime or, worse, be handed to every visitor.

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}

const PUBLISHABLE_PREFIX = "sb_publishable_";
const SECRET_PREFIX = "sb_secret_";

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

/** The `role` claim of a Supabase JWT, or null if this isn't one. */
export function jwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * True only for a key that is safe to publish to the browser: a legacy `anon`
 * JWT, or a new-style publishable key.
 *
 * A `service_role` JWT and an `sb_secret_` key are rejected explicitly. Those
 * bypass row-level security on every table in the project, so handing one to
 * the browser would expose the entire database — including any other
 * application sharing the same Supabase project.
 */
export function isPublishableKey(key: string): boolean {
  if (!key || /\s/.test(key)) return false;
  if (key.startsWith(SECRET_PREFIX)) return false;
  if (key.startsWith(PUBLISHABLE_PREFIX)) {
    return key.length > PUBLISHABLE_PREFIX.length + 8;
  }
  // Legacy keys are JWTs; accept the anon role only.
  return jwtRole(key) === "anon";
}

/** A placeholder in .env.example must not count as configured. */
export function looksLikeRealCredentials(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (url.includes("your-project") || key.includes("your-anon-key")) return false;
  if (!isPublishableKey(key)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
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

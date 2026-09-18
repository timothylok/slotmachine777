import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./config";
import type { Database } from "./types";

/** Server-side client bound to the request's cookies. Null when unconfigured. */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  const { url, anonKey, configured } = readSupabaseEnv();
  if (!configured) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session instead.
        }
      },
    },
  });
}

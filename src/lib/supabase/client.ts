"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "./config";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;
let cachedUrl: string | null = null;

/**
 * Builds the browser client from the config the server passed down. Returns
 * null when Supabase is not configured, and callers fall back to guest mode.
 */
export function getSupabaseBrowserClient(
  config: SupabaseConfig,
): SupabaseClient<Database> | null {
  if (!config.configured) return null;
  if (!browserClient || cachedUrl !== config.url) {
    browserClient = createBrowserClient<Database>(config.url, config.anonKey);
    cachedUrl = config.url;
  }
  return browserClient;
}

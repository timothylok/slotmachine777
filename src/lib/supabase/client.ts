"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

/** Returns null when Supabase has not been configured — callers fall back to guest mode. */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  browserClient ??= createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
  return browserClient;
}

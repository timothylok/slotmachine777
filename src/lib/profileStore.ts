"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BET_STEPS } from "./slot";
import {
  DEFAULT_STATE,
  GUEST_STORAGE_KEY,
  sanitizeState,
  type GameState,
} from "./gameState";
import type { Database } from "./supabase/types";

/** Guest progress lives in this browser only. */
export const guestStore = {
  load(): GameState {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      return sanitizeState(raw ? JSON.parse(raw) : null, BET_STEPS);
    } catch {
      return { ...DEFAULT_STATE };
    }
  },
  save(state: GameState) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or storage disabled — the game still works in memory.
    }
  },
  clear() {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

/** Signed-in progress lives in the `slot_profiles` table, one row per user. */
export async function loadProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<GameState> {
  const { data, error } = await supabase
    .from("slot_profiles")
    .select("credits, best_win, spins")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT_STATE };

  return sanitizeState(
    {
      credits: data.credits,
      best: data.best_win,
      spins: data.spins,
    },
    BET_STEPS,
  );
}

export async function saveProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  state: GameState,
): Promise<void> {
  await supabase.from("slot_profiles").upsert(
    {
      id: userId,
      credits: state.credits,
      best_win: state.best,
      spins: state.spins,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

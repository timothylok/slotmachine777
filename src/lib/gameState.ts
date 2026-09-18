// The player's saved progress, shared by the guest (localStorage) and the
// signed-in (Supabase) backends. Everything here is pure so it can be tested
// without a browser or a database.

export interface GameState {
  credits: number;
  /** Coins wagered per payline. */
  coin: number;
  best: number;
  spins: number;
  muted: boolean;
}

export const STARTING_CREDITS = 1000;

export const DEFAULT_STATE: GameState = {
  credits: STARTING_CREDITS,
  coin: 1,
  best: 0,
  spins: 0,
  muted: false,
};

export const GUEST_STORAGE_KEY = "lucky777.state.v2";
export const GUEST_FLAG_KEY = "lucky777.guest";

function clampNumber(value: unknown, fallback: number, min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.round(value * 100) / 100);
}

/**
 * Accepts anything (untrusted localStorage, a partial database row) and
 * returns a usable state. `allowed` pins `coin` to a real bet step.
 */
export function sanitizeState(
  input: unknown,
  allowedCoins: readonly number[],
): GameState {
  const raw = (input ?? {}) as Partial<GameState>;
  return {
    credits: clampNumber(raw.credits, DEFAULT_STATE.credits),
    coin: allowedCoins.includes(raw.coin as number)
      ? (raw.coin as number)
      : DEFAULT_STATE.coin,
    best: clampNumber(raw.best, DEFAULT_STATE.best),
    spins: Math.max(0, Math.trunc(clampNumber(raw.spins, 0))),
    muted: Boolean(raw.muted),
  };
}

/** True when a saved profile has never actually been played. */
export function isUntouched(state: GameState): boolean {
  return state.spins === 0 && state.credits === STARTING_CREDITS;
}

/**
 * Called the first time a guest signs in. A brand-new account inherits the
 * guest's progress; an existing account keeps its own, but never loses its
 * best win.
 */
export function mergeStates(local: GameState, remote: GameState): GameState {
  const base = isUntouched(remote) ? local : remote;
  return {
    ...base,
    best: Math.max(local.best, remote.best),
    spins: Math.max(local.spins, remote.spins),
    // Sound is a device preference, not account data.
    muted: local.muted,
  };
}

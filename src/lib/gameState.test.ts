import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  STARTING_CREDITS,
  isUntouched,
  mergeStates,
  sanitizeState,
  type GameState,
} from "./gameState";

const COINS = [1, 2, 5, 10] as const;

function make(overrides: Partial<GameState> = {}): GameState {
  return { ...DEFAULT_STATE, ...overrides };
}

describe("sanitizeState", () => {
  it("falls back to defaults for null, undefined and junk", () => {
    expect(sanitizeState(null, COINS)).toEqual(DEFAULT_STATE);
    expect(sanitizeState(undefined, COINS)).toEqual(DEFAULT_STATE);
    expect(sanitizeState("not an object", COINS)).toEqual(DEFAULT_STATE);
  });

  it("keeps valid values", () => {
    const state = sanitizeState(
      { credits: 250, coin: 5, best: 90, spins: 12, muted: true },
      COINS,
    );
    expect(state).toEqual({
      credits: 250,
      coin: 5,
      best: 90,
      spins: 12,
      muted: true,
    });
  });

  it("rejects a coin value that is not a real bet step", () => {
    expect(sanitizeState({ coin: 7 }, COINS).coin).toBe(DEFAULT_STATE.coin);
    expect(sanitizeState({ coin: 10 }, COINS).coin).toBe(10);
  });

  it("refuses negative or non-finite credits", () => {
    expect(sanitizeState({ credits: -500 }, COINS).credits).toBe(0);
    expect(sanitizeState({ credits: Number.NaN }, COINS).credits).toBe(
      STARTING_CREDITS,
    );
    expect(sanitizeState({ credits: Infinity }, COINS).credits).toBe(
      STARTING_CREDITS,
    );
  });

  it("rounds credits to two decimals and truncates the spin counter", () => {
    expect(sanitizeState({ credits: 10.129 }, COINS).credits).toBe(10.13);
    expect(sanitizeState({ spins: 4.8 }, COINS).spins).toBe(4);
  });

  it("coerces a non-boolean mute flag", () => {
    expect(sanitizeState({ muted: "yes" as unknown as boolean }, COINS).muted).toBe(
      true,
    );
    expect(sanitizeState({ muted: 0 as unknown as boolean }, COINS).muted).toBe(
      false,
    );
  });
});

describe("isUntouched", () => {
  it("is true only for a fresh profile", () => {
    expect(isUntouched(make())).toBe(true);
    expect(isUntouched(make({ spins: 1 }))).toBe(false);
    expect(isUntouched(make({ credits: 999 }))).toBe(false);
  });
});

describe("mergeStates", () => {
  it("carries guest progress into a brand-new account", () => {
    const local = make({ credits: 4200, best: 900, spins: 60 });
    const remote = make();
    expect(mergeStates(local, remote)).toEqual({
      credits: 4200,
      coin: local.coin,
      best: 900,
      spins: 60,
      muted: local.muted,
    });
  });

  it("keeps the existing account's credits when it has been played", () => {
    const local = make({ credits: 4200, best: 900, spins: 60 });
    const remote = make({ credits: 80, best: 1500, spins: 400 });
    const merged = mergeStates(local, remote);
    expect(merged.credits).toBe(80);
    expect(merged.spins).toBe(400);
  });

  it("never loses the best win", () => {
    const local = make({ best: 5000, spins: 3 });
    const remote = make({ credits: 10, best: 20, spins: 900 });
    expect(mergeStates(local, remote).best).toBe(5000);
    expect(mergeStates(remote, local).best).toBe(5000);
  });

  it("treats mute as a per-device preference", () => {
    const local = make({ muted: true });
    const remote = make({ credits: 1, spins: 5, muted: false });
    expect(mergeStates(local, remote).muted).toBe(true);
  });
});

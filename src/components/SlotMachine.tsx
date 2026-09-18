"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reel from "./Reel";
import Paytable from "./Paytable";
import { sfx } from "@/lib/sound";
import { usePlayer } from "./PlayerProvider";
import AccountChip from "./AccountChip";
import { STARTING_CREDITS } from "@/lib/gameState";
import {
  BET_STEPS,
  LINE_COLORS,
  PAYLINES,
  REELS,
  SPIN_CYCLES,
  STRIPS,
  SYMBOLS,
  spin as rollSpin,
  type SpinResult,
} from "@/lib/slot";

interface ReelState {
  position: number;
  animating: boolean;
}

const INITIAL_REELS: ReelState[] = Array.from({ length: REELS }, (_, i) => ({
  position: i * 3,
  animating: false,
}));

/** Longest reel animation (0.75s + 4 × 0.22s) plus headroom. */
const SETTLE_TIMEOUT_MS = 2000;

export default function SlotMachine() {
  // Credits, bet, best win and the sound preference all live in the player
  // store, which persists to Supabase when signed in and to localStorage
  // when playing as a guest.
  const { state, update } = usePlayer();
  const { credits, coin, muted, best } = state;

  /** Total stake: one coin on each payline. */
  const bet = coin * PAYLINES.length;

  const setCredits = useCallback(
    (next: (current: number) => number) =>
      update((s) => ({ ...s, credits: next(s.credits) })),
    [update],
  );
  const setBest = useCallback(
    (next: (current: number) => number) =>
      update((s) => ({ ...s, best: next(s.best) })),
    [update],
  );
  const setCoin = useCallback(
    (value: number) => update((s) => ({ ...s, coin: value })),
    [update],
  );
  const setMuted = useCallback(
    (next: (current: boolean) => boolean) =>
      update((s) => ({ ...s, muted: next(s.muted) })),
    [update],
  );
  const countSpin = useCallback(
    () => update((s) => ({ ...s, spins: s.spins + 1 })),
    [update],
  );

  const [result, setResult] = useState<SpinResult | null>(null);
  const [reels, setReels] = useState<ReelState[]>(INITIAL_REELS);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Place your bet and pull the lever.");
  const [freeSpins, setFreeSpins] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [leverPulled, setLeverPulled] = useState(false);

  const settledReels = useRef<Set<number>>(new Set());
  const pendingResult = useRef<SpinResult | null>(null);

  const play = useCallback(
    (name: keyof typeof sfx, ...args: number[]) => {
      if (muted) return;
      (sfx[name] as (...a: number[]) => void)(...args);
    },
    [muted],
  );

  // --- spinning ----------------------------------------------------------
  const doSpin = useCallback(() => {
    if (spinning) return;
    const usingFreeSpin = freeSpins > 0;
    if (!usingFreeSpin && credits < bet) {
      setMessage("Not enough credits — lower your bet or reset the bank.");
      setAutoplay(false);
      return;
    }

    if (!muted) sfx.unlock();
    if (usingFreeSpin) {
      setFreeSpins((n) => n - 1);
    } else {
      setCredits((c) => c - bet);
    }
    countSpin();

    const outcome = rollSpin(bet);
    pendingResult.current = outcome;
    settledReels.current = new Set();

    setLastWin(0);
    setResult(outcome);
    setSpinning(true);
    setMessage(usingFreeSpin ? "Free spin!" : "Spinning…");
    setReels((prev) =>
      prev.map((reel, i) => {
        const len = STRIPS[i].length;
        const delta = (((outcome.stops[i] - reel.position) % len) + len) % len;
        return {
          position: reel.position + len * SPIN_CYCLES + delta,
          animating: true,
        };
      }),
    );
    setLeverPulled(true);
    play("lever");
    window.setTimeout(() => setLeverPulled(false), 320);

  }, [spinning, freeSpins, credits, bet, muted, play, setCredits, countSpin]);

  const handleReelSettled = useCallback(
    (reelIndex: number) => {
      if (settledReels.current.has(reelIndex)) return;
      settledReels.current.add(reelIndex);
      play("reelStop", reelIndex);
      // Snap back by whole revolutions so the offset stays bounded.
      setReels((prev) =>
        prev.map((reel, i) =>
          i === reelIndex
            ? { position: reel.position % STRIPS[i].length, animating: false }
            : reel,
        ),
      );
      if (settledReels.current.size < REELS) return;

      const outcome = pendingResult.current;
      setSpinning(false);
      if (!outcome) return;

      if (outcome.totalWin > 0) {
        setCredits((c) => Math.round((c + outcome.totalWin) * 100) / 100);
        setLastWin(outcome.totalWin);
        setBest((b) => Math.max(b, outcome.totalWin));
      }

      if (outcome.freeSpinsAwarded > 0) {
        setFreeSpins((n) => n + outcome.freeSpinsAwarded);
        setMessage(
          `${outcome.scatterCount} scatters — ${outcome.freeSpinsAwarded} free spins!`,
        );
        play("bonus");
      } else if (outcome.totalWin > 0) {
        const ratio = outcome.totalWin / outcome.bet;
        setMessage(
          ratio >= 20
            ? `MEGA WIN — ${outcome.totalWin.toLocaleString()} credits!`
            : ratio >= 5
              ? `Big win — ${outcome.totalWin.toLocaleString()} credits!`
              : `You won ${outcome.totalWin.toLocaleString()} credits.`,
        );
        play("win", ratio);
      } else {
        setMessage("No win. Spin again.");
        play("lose");
      }
    },
    [play, setCredits, setBest],
  );

  // A backgrounded tab never fires `transitionend`, so make sure every spin
  // resolves even when the animation never actually runs.
  useEffect(() => {
    if (!spinning) return;
    const t = window.setTimeout(() => {
      for (let i = 0; i < REELS; i++) handleReelSettled(i);
    }, SETTLE_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [spinning, handleReelSettled]);

  // Autoplay drives the next spin once the reels settle.
  useEffect(() => {
    if (!autoplay || spinning) return;
    const t = window.setTimeout(() => {
      if (freeSpins === 0 && credits < bet) {
        setAutoplay(false);
        return;
      }
      doSpin();
    }, 900);
    return () => window.clearTimeout(t);
  }, [autoplay, spinning, credits, bet, freeSpins, doSpin]);

  // Free spins keep rolling on their own.
  useEffect(() => {
    if (autoplay || spinning || freeSpins === 0) return;
    const t = window.setTimeout(doSpin, 900);
    return () => window.clearTimeout(t);
  }, [autoplay, spinning, freeSpins, doSpin]);

  // Spacebar spins.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "BUTTON", "SELECT"].includes(target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        doSpin();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSpin]);

  // --- derived -----------------------------------------------------------
  const winningCells: Set<number>[] = Array.from({ length: REELS }, () => new Set());
  if (!spinning && result) {
    for (const w of result.lineWins) {
      for (const [reel, row] of w.cells) winningCells[reel].add(row);
    }
    if (result.scatterCount >= 3) {
      result.grid.forEach((reel, r) =>
        reel.forEach((s, row) => {
          if (s === "scatter") winningCells[r].add(row);
        }),
      );
    }
  }
  const hasWin = winningCells.some((s) => s.size > 0);
  const canSpin = !spinning && (freeSpins > 0 || credits >= bet);
  const coinIndex = BET_STEPS.indexOf(coin);

  function changeBet(direction: 1 | -1) {
    const next = coinIndex + direction;
    if (next < 0 || next >= BET_STEPS.length) return;
    setCoin(BET_STEPS[next]);
  }

  function resetBank() {
    setCredits(() => STARTING_CREDITS);
    setFreeSpins(0);
    setAutoplay(false);
    setMessage("Bank reset. Good luck.");
  }

  return (
    <div className="cabinet">
      <header className="cabinet-head">
        <h1 className="logo">
          <span className="logo-7">7</span>
          <span className="logo-7">7</span>
          <span className="logo-7">7</span>
          <span className="logo-word">Lucky Sevens</span>
        </h1>
        <div className="head-actions">
          <AccountChip />
          <button
            className="btn btn-ghost"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
          >
            {muted ? "🔇 Muted" : "🔊 Sound"}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowPaytable(true)}>
            📖 Paytable
          </button>
        </div>
      </header>

      <div className="machine">
        <div className={`screen${hasWin ? " screen-win" : ""}`}>
          <div className="reels">
            {Array.from({ length: REELS }, (_, i) => (
              <Reel
                key={i}
                reelIndex={i}
                position={reels[i].position}
                animating={reels[i].animating}
                highlighted={winningCells[i]}
                dimmed={hasWin}
                onSettled={handleReelSettled}
              />
            ))}
          </div>
          {freeSpins > 0 && (
            <div className="free-badge">🎁 {freeSpins} free spins left</div>
          )}
        </div>

        <button
          className={`lever${leverPulled ? " lever-pulled" : ""}`}
          onClick={doSpin}
          disabled={!canSpin}
          aria-label="Pull lever to spin"
        >
          <span className="lever-rod" />
          <span className="lever-knob" />
        </button>
      </div>

      <div className={`message${hasWin ? " message-win" : ""}`} role="status">
        {message}
      </div>

      {!spinning && result && result.lineWins.length > 0 && (
        <ul className="win-lines">
          {result.lineWins.map((w) => (
            <li key={w.line}>
              <span
                className="win-dot"
                style={{ background: LINE_COLORS[w.line] }}
                aria-hidden
              />
              Line {w.line + 1} · {w.count}× {SYMBOLS[w.symbol].glyph}
              <strong>+{w.amount.toLocaleString()}</strong>
            </li>
          ))}
          {result.scatterWin > 0 && (
            <li>
              <span className="win-dot win-dot-scatter" aria-hidden />
              {result.scatterCount}× scatter
              <strong>+{result.scatterWin.toLocaleString()}</strong>
            </li>
          )}
        </ul>
      )}

      <div className="panel">
        <div className="meters">
          <div className="meter">
            <span className="meter-label">Credits</span>
            <span className="meter-value">{credits.toLocaleString()}</span>
          </div>
          <div className="meter">
            <span className="meter-label">
              Bet · {coin}/line
            </span>
            <span className="meter-value">{bet.toLocaleString()}</span>
          </div>
          <div className="meter">
            <span className="meter-label">Win</span>
            <span className={`meter-value${lastWin > 0 ? " meter-hot" : ""}`}>
              {lastWin.toLocaleString()}
            </span>
          </div>
          <div className="meter">
            <span className="meter-label">Best</span>
            <span className="meter-value">{best.toLocaleString()}</span>
          </div>
        </div>

        <div className="controls">
          <div className="bet-group">
            <button
              className="btn btn-round"
              onClick={() => changeBet(-1)}
              disabled={spinning || coinIndex === 0}
              aria-label="Decrease bet"
            >
              −
            </button>
            <span className="bet-readout">{bet}</span>
            <button
              className="btn btn-round"
              onClick={() => changeBet(1)}
              disabled={spinning || coinIndex === BET_STEPS.length - 1}
              aria-label="Increase bet"
            >
              +
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setCoin(BET_STEPS[BET_STEPS.length - 1])}
              disabled={spinning}
            >
              Max
            </button>
          </div>

          <button className="btn btn-spin" onClick={doSpin} disabled={!canSpin}>
            {spinning ? "Spinning…" : freeSpins > 0 ? "Free Spin" : "Spin"}
          </button>

          <div className="aux-group">
            <button
              className={`btn btn-ghost${autoplay ? " btn-on" : ""}`}
              onClick={() => setAutoplay((a) => !a)}
              aria-pressed={autoplay}
            >
              {autoplay ? "⏹ Stop auto" : "🔁 Autoplay"}
            </button>
            <button className="btn btn-ghost" onClick={resetBank}>
              ♻️ Reset bank
            </button>
          </div>
        </div>
        <p className="hint">Press <kbd>Space</kbd> to spin. Play money only — no real wagering.</p>
      </div>

      {showPaytable && <Paytable onClose={() => setShowPaytable(false)} />}
    </div>
  );
}

// Core slot-machine math. Pure functions — no React, no DOM, so it can be
// unit-tested or reused on the server.

export type SymbolId =
  | "cherry"
  | "lemon"
  | "grape"
  | "bell"
  | "star"
  | "diamond"
  | "seven"
  | "scatter";

export interface SymbolDef {
  id: SymbolId;
  glyph: string;
  label: string;
  /** Tailwind-ish accent used for glow/highlight. */
  color: string;
}

export const SYMBOLS: Record<SymbolId, SymbolDef> = {
  cherry: { id: "cherry", glyph: "🍒", label: "Cherry", color: "#f43f5e" },
  lemon: { id: "lemon", glyph: "🍋", label: "Lemon", color: "#facc15" },
  grape: { id: "grape", glyph: "🍇", label: "Grape", color: "#a855f7" },
  bell: { id: "bell", glyph: "🔔", label: "Bell", color: "#fbbf24" },
  star: { id: "star", glyph: "⭐", label: "Star", color: "#38bdf8" },
  diamond: { id: "diamond", glyph: "💎", label: "Diamond", color: "#22d3ee" },
  seven: { id: "seven", glyph: "7️⃣", label: "Lucky Seven", color: "#ef4444" },
  scatter: { id: "scatter", glyph: "🎰", label: "Scatter", color: "#34d399" },
};

export const REELS = 5;
/** Full strip revolutions a reel makes before settling. */
export const SPIN_CYCLES = 3;
export const ROWS = 3;

/**
 * Per-reel strips. Repetition is the weighting: the more often a symbol
 * appears on a strip, the more often it lands. Later reels carry fewer
 * high-value symbols, which is what keeps the RTP sane.
 */
const STRIP_BASE: SymbolId[] = [
  "cherry", "cherry", "cherry", "cherry",
  "lemon", "lemon", "lemon", "lemon",
  "grape", "grape", "grape",
  "bell", "bell", "bell",
  "star", "star",
  "diamond", "diamond",
  "seven",
  "scatter",
];

const STRIP_LATE: SymbolId[] = [
  "cherry", "cherry", "cherry", "cherry", "cherry",
  "lemon", "lemon", "lemon", "lemon", "lemon",
  "grape", "grape", "grape", "grape",
  "bell", "bell", "bell",
  "star", "star",
  "diamond",
  "seven",
  "scatter",
];

export const STRIPS: SymbolId[][] = [
  STRIP_BASE,
  STRIP_BASE,
  STRIP_BASE,
  STRIP_LATE,
  STRIP_LATE,
];

export type MatchCount = 2 | 3 | 4 | 5;

/**
 * Payout multiplier (× line bet) for N-of-a-kind from the leftmost reel.
 * Tuned by simulation for a ~95% return to player — see `npm run rtp`.
 */
const PAYTABLE: Record<SymbolId, Partial<Record<MatchCount, number>>> = {
  seven: { 2: 8, 3: 135, 4: 540, 5: 2500 },
  diamond: { 2: 4, 3: 75, 4: 270, 5: 1000 },
  star: { 3: 44, 4: 150, 5: 500 },
  bell: { 3: 27, 4: 90, 5: 250 },
  grape: { 3: 16, 4: 54, 5: 150 },
  lemon: { 3: 11, 4: 38, 5: 100 },
  cherry: { 2: 2, 3: 10, 4: 27, 5: 80 },
  scatter: {},
};

/** Scatter pays anywhere on the screen, multiplied by the *total* bet. */
const SCATTER_PAY: Record<number, number> = { 3: 2, 4: 10, 5: 50 };
const SCATTER_FREE_SPINS: Record<number, number> = { 3: 5, 4: 10, 5: 15 };

/** Row index per reel. Index 0 is the top row. */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // middle
  [0, 0, 0, 0, 0], // top
  [2, 2, 2, 2, 2], // bottom
  [0, 1, 2, 1, 0], // V
  [2, 1, 0, 1, 2], // Λ
];

export const LINE_COLORS = [
  "#f43f5e",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#a855f7",
];

export const BET_STEPS = [1, 2, 5, 10, 25, 50, 100];

export interface LineWin {
  line: number;
  symbol: SymbolId;
  count: number;
  amount: number;
  /** [reel, row] cells that form the win, for highlighting. */
  cells: [number, number][];
}

export interface SpinResult {
  /** grid[reel][row] */
  grid: SymbolId[][];
  /** Stop index into each reel strip — the animation needs this. */
  stops: number[];
  lineWins: LineWin[];
  scatterCount: number;
  scatterWin: number;
  freeSpinsAwarded: number;
  totalWin: number;
  bet: number;
}

function randomInt(max: number): number {
  // crypto.getRandomValues where available; Math.random is the fallback.
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    let v: number;
    do {
      globalThis.crypto.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % max;
  }
  return Math.floor(Math.random() * max);
}

export function symbolAt(reel: number, index: number): SymbolId {
  const strip = STRIPS[reel];
  return strip[((index % strip.length) + strip.length) % strip.length];
}

/** The three visible symbols on a reel given its stop index. */
export function windowAt(reel: number, stop: number): SymbolId[] {
  return Array.from({ length: ROWS }, (_, row) => symbolAt(reel, stop + row));
}

export function spin(bet: number): SpinResult {
  const lineBet = bet / PAYLINES.length;
  const stops = STRIPS.map((strip) => randomInt(strip.length));
  const grid = stops.map((stop, reel) => windowAt(reel, stop));

  const lineWins: LineWin[] = [];
  PAYLINES.forEach((pattern, line) => {
    const first = grid[0][pattern[0]];
    if (first === "scatter") return;

    let count = 1;
    while (count < REELS && grid[count][pattern[count]] === first) count++;

    const pay = PAYTABLE[first][count as MatchCount];
    if (count >= 2 && pay) {
      lineWins.push({
        line,
        symbol: first,
        count,
        amount: pay * lineBet,
        cells: Array.from(
          { length: count },
          (_, reel) => [reel, pattern[reel]] as [number, number],
        ),
      });
    }
  });

  let scatterCount = 0;
  for (const reel of grid) {
    for (const s of reel) if (s === "scatter") scatterCount++;
  }

  const scatterWin = (SCATTER_PAY[scatterCount] ?? 0) * bet;
  const freeSpinsAwarded = SCATTER_FREE_SPINS[scatterCount] ?? 0;
  const totalWin =
    lineWins.reduce((sum, w) => sum + w.amount, 0) + scatterWin;

  return {
    grid,
    stops,
    lineWins,
    scatterCount,
    scatterWin,
    freeSpinsAwarded,
    totalWin: Math.round(totalWin * 100) / 100,
    bet,
  };
}

/** Rows of the paytable UI, richest first. */
export const PAYTABLE_ROWS = (
  ["seven", "diamond", "star", "bell", "grape", "lemon", "cherry"] as SymbolId[]
).map((id) => ({
  symbol: SYMBOLS[id],
  pays: PAYTABLE[id] as Partial<Record<MatchCount, number>>,
}));

export const SCATTER_INFO = {
  symbol: SYMBOLS.scatter,
  pays: SCATTER_PAY,
  freeSpins: SCATTER_FREE_SPINS,
};

import { describe, expect, it } from "vitest";
import {
  BET_STEPS,
  PAYLINES,
  PAYTABLE_ROWS,
  REELS,
  ROWS,
  SCATTER_INFO,
  STRIPS,
  SYMBOLS,
  spin,
  symbolAt,
  windowAt,
  type SymbolId,
} from "./slot";

describe("reel strips", () => {
  it("has one strip per reel, each containing only known symbols", () => {
    expect(STRIPS).toHaveLength(REELS);
    for (const strip of STRIPS) {
      expect(strip.length).toBeGreaterThan(ROWS);
      for (const id of strip) expect(SYMBOLS[id]).toBeDefined();
    }
  });

  it("puts exactly one scatter on every reel, so 5 scatters stay possible but rare", () => {
    for (const strip of STRIPS) {
      expect(strip.filter((s) => s === "scatter")).toHaveLength(1);
    }
  });

  it("wraps symbolAt in both directions", () => {
    const len = STRIPS[0].length;
    expect(symbolAt(0, len)).toBe(symbolAt(0, 0));
    expect(symbolAt(0, -1)).toBe(symbolAt(0, len - 1));
  });

  it("windowAt returns the three consecutive symbols under the stop", () => {
    const view = windowAt(0, 5);
    expect(view).toHaveLength(ROWS);
    expect(view).toEqual([symbolAt(0, 5), symbolAt(0, 6), symbolAt(0, 7)]);
  });
});

describe("paylines", () => {
  it("covers every reel and stays inside the visible rows", () => {
    expect(PAYLINES.length).toBeGreaterThan(0);
    for (const line of PAYLINES) {
      expect(line).toHaveLength(REELS);
      for (const row of line) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(ROWS);
      }
    }
  });

  it("has no duplicate lines", () => {
    const seen = new Set(PAYLINES.map((l) => l.join("")));
    expect(seen.size).toBe(PAYLINES.length);
  });
});

describe("paytable", () => {
  it("pays strictly more for longer matches", () => {
    for (const { symbol, pays } of PAYTABLE_ROWS) {
      expect(pays[3], symbol.id).toBeGreaterThan(0);
      expect(pays[4]!, symbol.id).toBeGreaterThan(pays[3]!);
      expect(pays[5]!, symbol.id).toBeGreaterThan(pays[4]!);
    }
  });

  it("ranks symbols consistently, richest first", () => {
    for (let i = 1; i < PAYTABLE_ROWS.length; i++) {
      expect(PAYTABLE_ROWS[i].pays[3]!).toBeLessThan(
        PAYTABLE_ROWS[i - 1].pays[3]!,
      );
    }
  });

  it("awards more free spins for more scatters", () => {
    expect(SCATTER_INFO.freeSpins[3]).toBeLessThan(SCATTER_INFO.freeSpins[4]);
    expect(SCATTER_INFO.freeSpins[4]).toBeLessThan(SCATTER_INFO.freeSpins[5]);
  });

  it("offers ascending bet steps", () => {
    for (let i = 1; i < BET_STEPS.length; i++) {
      expect(BET_STEPS[i]).toBeGreaterThan(BET_STEPS[i - 1]);
    }
  });
});

describe("spin", () => {
  const bet = 5;

  it("returns a full grid that matches the reported stops", () => {
    for (let i = 0; i < 200; i++) {
      const r = spin(bet);
      expect(r.grid).toHaveLength(REELS);
      r.grid.forEach((reel, index) => {
        expect(reel).toHaveLength(ROWS);
        expect(reel).toEqual(windowAt(index, r.stops[index]));
      });
    }
  });

  it("keeps stops inside their strip", () => {
    for (let i = 0; i < 200; i++) {
      const r = spin(bet);
      r.stops.forEach((stop, index) => {
        expect(stop).toBeGreaterThanOrEqual(0);
        expect(stop).toBeLessThan(STRIPS[index].length);
      });
    }
  });

  it("reports a total that equals the line wins plus the scatter win", () => {
    for (let i = 0; i < 500; i++) {
      const r = spin(bet);
      const sum = r.lineWins.reduce((acc, w) => acc + w.amount, 0) + r.scatterWin;
      expect(r.totalWin).toBeCloseTo(sum, 6);
    }
  });

  it("only reports line wins that are actually on the grid", () => {
    for (let i = 0; i < 500; i++) {
      const r = spin(bet);
      for (const win of r.lineWins) {
        expect(win.cells).toHaveLength(win.count);
        for (const [reel, row] of win.cells) {
          expect(r.grid[reel][row]).toBe(win.symbol);
          expect(PAYLINES[win.line][reel]).toBe(row);
        }
      }
    }
  });

  it("counts wins from the leftmost reel only", () => {
    for (let i = 0; i < 500; i++) {
      const r = spin(bet);
      for (const win of r.lineWins) {
        expect(win.cells[0][0]).toBe(0);
      }
    }
  });

  it("never pays a line win for scatters", () => {
    for (let i = 0; i < 500; i++) {
      for (const win of spin(bet).lineWins) {
        expect(win.symbol).not.toBe("scatter");
      }
    }
  });

  it("counts scatters anywhere on the grid", () => {
    for (let i = 0; i < 300; i++) {
      const r = spin(bet);
      const actual = r.grid
        .flat()
        .filter((s: SymbolId) => s === "scatter").length;
      expect(r.scatterCount).toBe(actual);
      if (r.scatterCount < 3) {
        expect(r.scatterWin).toBe(0);
        expect(r.freeSpinsAwarded).toBe(0);
      } else {
        expect(r.freeSpinsAwarded).toBeGreaterThan(0);
      }
    }
  });

  it("scales linearly with the bet", () => {
    // Same RNG draws are not reproducible, so compare aggregates instead.
    const runs = 20000;
    let small = 0;
    let large = 0;
    for (let i = 0; i < runs; i++) small += spin(5).totalWin;
    for (let i = 0; i < runs; i++) large += spin(50).totalWin;
    expect(large / small).toBeGreaterThan(8);
    expect(large / small).toBeLessThan(12);
  });

  it("never returns a negative win", () => {
    for (let i = 0; i < 1000; i++) {
      expect(spin(bet).totalWin).toBeGreaterThanOrEqual(0);
    }
  });

  it("holds an RTP in the 90-100% band once free spins are included", () => {
    const runs = 120000;
    const stake = 10;
    let won = 0;
    let freeSpinsAwarded = 0;

    for (let i = 0; i < runs; i++) {
      const r = spin(stake);
      won += r.totalWin;
      freeSpinsAwarded += r.freeSpinsAwarded;
    }

    const baseRtp = won / (runs * stake);
    const effective = baseRtp * (1 + freeSpinsAwarded / runs);
    expect(effective).toBeGreaterThan(0.9);
    expect(effective).toBeLessThan(1.0);
  });
});

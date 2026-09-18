// Monte-Carlo check of the paytable. Run with `npm run rtp`.
import { spin } from "../src/lib/slot";
let staked = 0, won = 0, hits = 0, free = 0, freeWon = 0;
const N = 400000;
for (let i = 0; i < N; i++) {
  const r = spin(10);
  staked += 10; won += r.totalWin;
  if (r.totalWin > 0) hits++;
  if (r.freeSpinsAwarded) { free++; freeWon += r.freeSpinsAwarded; }
}
const base = won / staked;
console.log("base RTP:", (base * 100).toFixed(2) + "%");
console.log("free spins per spin:", (freeWon / N).toFixed(4));
console.log("effective RTP (incl. free spins):", (base * (1 + freeWon / N) * 100).toFixed(2) + "%");
console.log("hit rate:", ((hits / N) * 100).toFixed(2) + "%");
console.log("bonus trigger: 1 in " + Math.round(N / free));

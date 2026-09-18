"use client";

import {
  ROWS,
  SPIN_CYCLES,
  STRIPS,
  SYMBOLS,
  symbolAt,
  type SymbolId,
} from "@/lib/slot";

interface ReelProps {
  reelIndex: number;
  /** Index of the strip cell currently at the top of the window. */
  position: number;
  /** True while the strip is sliding to `position`. */
  animating: boolean;
  /** Row indices to highlight as part of a win. */
  highlighted: Set<number>;
  dimmed: boolean;
  onSettled: (reelIndex: number) => void;
}

export default function Reel({
  reelIndex,
  position,
  animating,
  highlighted,
  dimmed,
  onSettled,
}: ReelProps) {
  const len = STRIPS[reelIndex].length;
  // The strip is rendered once and only slid around; after each spin the
  // parent snaps the position back by whole revolutions, which is invisible
  // but keeps the list a fixed length.
  const cells = len * (SPIN_CYCLES + 2) + ROWS;
  const duration = 0.75 + reelIndex * 0.22;

  function handleTransitionEnd(event: React.TransitionEvent) {
    if (event.propertyName !== "transform" || !animating) return;
    onSettled(reelIndex);
  }

  return (
    <div className="reel-window">
      <div
        className="reel-strip"
        style={{
          transform: `translateY(calc(var(--cell) * ${-position}))`,
          transition: animating
            ? `transform ${duration}s cubic-bezier(0.18, 0.72, 0.2, 1)`
            : "none",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {Array.from({ length: cells }, (_, i) => {
          const id: SymbolId = symbolAt(reelIndex, i);
          const row = animating ? -1 : i - position;
          const visible = row >= 0 && row < ROWS;
          const isWinner = visible && highlighted.has(row);
          return (
            <div
              key={i}
              className={`reel-cell${isWinner ? " reel-cell-win" : ""}${
                dimmed && !isWinner ? " reel-cell-dim" : ""
              }`}
              style={
                isWinner
                  ? ({ "--accent": SYMBOLS[id].color } as React.CSSProperties)
                  : undefined
              }
              aria-hidden={!visible}
            >
              <span className="reel-glyph">{SYMBOLS[id].glyph}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

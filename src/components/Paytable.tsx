"use client";

import {
  LINE_COLORS,
  PAYLINES,
  PAYTABLE_ROWS,
  REELS,
  ROWS,
  SCATTER_INFO,
} from "@/lib/slot";

export default function Paytable({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Paytable"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Paytable</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close paytable">
            ✕
          </button>
        </div>

        <p className="modal-note">
          Multipliers apply to the <strong>line bet</strong> (total bet ÷{" "}
          {PAYLINES.length}). Combinations pay left to right from reel 1.
        </p>

        <table className="paytable">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">2×</th>
              <th scope="col">3×</th>
              <th scope="col">4×</th>
              <th scope="col">5×</th>
            </tr>
          </thead>
          <tbody>
            {PAYTABLE_ROWS.map(({ symbol, pays }) => (
              <tr key={symbol.id}>
                <th scope="row">
                  <span className="pt-glyph">{symbol.glyph}</span>
                  {symbol.label}
                </th>
                <td>{pays[2] ?? "—"}</td>
                <td>{pays[3]}</td>
                <td>{pays[4]}</td>
                <td>{pays[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="modal-sub">
          <span className="pt-glyph">{SCATTER_INFO.symbol.glyph}</span> Scatter
        </h3>
        <p className="modal-note">
          Pays anywhere on the screen, multiplied by the <strong>total bet</strong>,
          and awards free spins.
        </p>
        <ul className="scatter-list">
          {[3, 4, 5].map((n) => (
            <li key={n}>
              <span>{n}×</span> {SCATTER_INFO.pays[n]}× total bet ·{" "}
              {SCATTER_INFO.freeSpins[n]} free spins
            </li>
          ))}
        </ul>

        <h3 className="modal-sub">Paylines</h3>
        <div className="line-grid">
          {PAYLINES.map((pattern, line) => (
            <div key={line} className="line-card">
              <span className="line-name" style={{ color: LINE_COLORS[line] }}>
                Line {line + 1}
              </span>
              <div className="line-map">
                {Array.from({ length: ROWS }, (_, row) => (
                  <div key={row} className="line-row">
                    {Array.from({ length: REELS }, (_, reel) => (
                      <span
                        key={reel}
                        className={`line-dot${
                          pattern[reel] === row ? " line-dot-on" : ""
                        }`}
                        style={
                          pattern[reel] === row
                            ? { background: LINE_COLORS[line] }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Synthesized audio via the Web Audio API — no sample files to license or ship.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  sweepTo?: number;
}

function tone({
  freq,
  duration,
  type = "square",
  gain = 0.08,
  delay = 0,
  sweepTo,
}: ToneOptions) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const vol = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(sweepTo, 1),
      start + duration,
    );
  }

  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(vol).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export const sfx = {
  /** Browsers require a user gesture before audio can start. */
  unlock() {
    audio();
  },
  lever() {
    tone({ freq: 220, duration: 0.18, type: "sawtooth", sweepTo: 90, gain: 0.06 });
  },
  reelStop(index: number) {
    tone({
      freq: 180 + index * 40,
      duration: 0.09,
      type: "triangle",
      gain: 0.09,
    });
  },
  win(magnitude: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const steps = Math.min(notes.length, 2 + Math.floor(magnitude));
    for (let i = 0; i < steps; i++) {
      tone({
        freq: notes[i],
        duration: 0.16,
        type: "triangle",
        gain: 0.07,
        delay: i * 0.09,
      });
    }
  },
  bonus() {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.22, type: "square", gain: 0.06, delay: i * 0.1 }),
    );
  },
  lose() {
    tone({ freq: 160, duration: 0.2, type: "sine", sweepTo: 80, gain: 0.05 });
  },
};

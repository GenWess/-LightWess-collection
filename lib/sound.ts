"use client";

/** Petits sons générés par le navigateur (aucun fichier à charger). */
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try { return localStorage.getItem("lw-sound") !== "0"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { localStorage.setItem("lw-sound", on ? "1" : "0"); } catch {}
}

function ac(): AudioContext | null {
  if (!soundOn() || typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(f: number, d: number, type: OscillatorType = "sine", g = 0.12, f2?: number, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), a = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.008); a.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(a).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
}

function noise(d: number, f1: number, f2: number, g = 0.08) {
  const c = ac(); if (!c) return;
  const t = c.currentTime, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), a = c.createGain();
  s.buffer = b; fl.type = "bandpass"; fl.Q.value = 1.2;
  fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + d);
  a.gain.value = g; s.connect(fl).connect(a).connect(c.destination); s.start(t);
}

export const sfx = {
  tick: () => tone(1800 + Math.random() * 200, 0.018, "square", 0.02),
  tap: () => tone(520, 0.07, "sine", 0.09, 760),
  pop: () => tone(380, 0.09, "sine", 0.1, 720),
  yes: () => { noise(0.25, 900, 3800); tone(660, 0.12, "triangle", 0.09); tone(990, 0.18, "triangle", 0.08, undefined, 0.08); },
  no: () => { noise(0.25, 2600, 500); tone(200, 0.16, "sine", 0.12, 110); },
  flip: () => noise(0.2, 600, 2400, 0.06),
  star: (i: number) => tone(440 * Math.pow(1.122, i * 2), 0.09, "triangle", 0.08),
  ok: () => { tone(784, 0.09, "triangle", 0.08); tone(1175, 0.14, "triangle", 0.07, undefined, 0.07); },
  match: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, undefined, i * 0.08)),
  err: () => tone(220, 0.14, "square", 0.04, 160),
};

// Todos los sonidos se sintetizan con Web Audio: no hay archivos de audio.
const MUTE_KEY = 'cb.muted';
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = localStorage.getItem(MUTE_KEY) === '1';

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.2, attack = 0.004, slide = null, delay = 0 } = {}) {
  if (!ensure()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.2, type = 'highpass', freq = 1000, to = null, q = 0.7, delay = 0 } = {}) {
  if (!ensure()) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

const SIMON_FREQ = { red: 440, blue: 554.4, green: 659.3, yellow: 784 };

export const audio = {
  unlock: () => ensure(),
  get muted() { return muted; },
  toggleMute() {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    if (master) master.gain.value = muted ? 0 : 0.55;
    return muted;
  },
  tick(urgent) {
    tone(urgent ? 1560 : 1180, 0.05, { type: 'square', vol: urgent ? 0.07 : 0.045 });
  },
  click() {
    noise(0.03, { vol: 0.25, freq: 2500 });
    tone(320, 0.04, { type: 'triangle', vol: 0.12 });
  },
  softClick() {
    noise(0.02, { vol: 0.12, freq: 3500 });
  },
  snip() {
    noise(0.07, { vol: 0.5, freq: 3800, type: 'bandpass', q: 1.5 });
    tone(2200, 0.03, { type: 'square', vol: 0.06 });
  },
  strike() {
    tone(150, 0.55, { type: 'sawtooth', vol: 0.32, slide: 70 });
    tone(157, 0.55, { type: 'square', vol: 0.12, slide: 74 });
    noise(0.25, { vol: 0.2, type: 'lowpass', freq: 900 });
  },
  solve() {
    tone(880, 0.16, { type: 'triangle', vol: 0.18 });
    tone(1318.5, 0.32, { type: 'triangle', vol: 0.16, delay: 0.1 });
  },
  simon(color) {
    tone(SIMON_FREQ[color] || 440, 0.32, { type: 'triangle', vol: 0.2 });
  },
  needyAlarm() {
    tone(1250, 0.08, { type: 'square', vol: 0.07 });
    tone(1250, 0.08, { type: 'square', vol: 0.07, delay: 0.14 });
  },
  needyOn() {
    tone(620, 0.12, { type: 'square', vol: 0.06 });
    tone(930, 0.16, { type: 'square', vol: 0.06, delay: 0.12 });
  },
  hum() {
    tone(90, 0.35, { type: 'sawtooth', vol: 0.05 });
  },
  explode() {
    noise(2.8, { vol: 1.2, type: 'lowpass', freq: 2400, to: 40, q: 0.4 });
    tone(55, 1.6, { type: 'sine', vol: 0.9, slide: 28 });
    noise(0.4, { vol: 0.8, freq: 600 });
  },
  defused() {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.16, delay: i * 0.11 }));
  },
  start() {
    tone(220, 0.18, { type: 'square', vol: 0.08 });
    tone(330, 0.18, { type: 'square', vol: 0.08, delay: 0.2 });
    tone(660, 0.4, { type: 'square', vol: 0.08, delay: 0.4 });
  },
};

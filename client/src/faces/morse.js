import { plate, lcd, lcdText, keycap, text, arrow, glow, engraved, rr } from './kit.js';
import { MORSE_WORDS } from '@shared/modules/morse.js';

const UNIT = 0.24;
const LAMP = { x: 122, y: 108, r: 36 };

// Secuencia [encendido, duración] del mensaje, en unidades de tiempo.
function schedule(signal) {
  const out = [];
  signal.forEach((code) => {
    [...code].forEach((sym, i) => {
      out.push([true, sym === '.' ? 1 : 3]);
      out.push([false, i === code.length - 1 ? 3 : 1]);
    });
  });
  out[out.length - 1] = [false, 7];
  return out;
}

function lampOn(view, ui) {
  if (ui.solved) return false;
  const sched = ui.local.sched || (ui.local.sched = schedule(view.signal));
  const total = sched.reduce((s, [, d]) => s + d, 0);
  let p = (ui.t / UNIT) % total;
  for (const [on, d] of sched) {
    if (p < d) return on;
    p -= d;
  }
  return false;
}

export default {
  regions() {
    return [
      { id: 'left', x: 34, y: 214, w: 70, h: 92 },
      { id: 'right', x: 408, y: 214, w: 70, h: 92 },
      { id: 'tx', x: 176, y: 352, w: 160, h: 96 },
    ];
  },
  animated: () => true,
  draw(ctx, view, ui) {
    plate(ctx);
    // lámpara
    ctx.fillStyle = '#151612';
    ctx.beginPath(); ctx.arc(LAMP.x, LAMP.y, LAMP.r + 12, 0, Math.PI * 2); ctx.fill();
    const on = lampOn(view, ui);
    const lampDraw = (c) => {
      const g = c.createRadialGradient(LAMP.x - 10, LAMP.y - 12, 4, LAMP.x, LAMP.y, LAMP.r);
      g.addColorStop(0, on ? '#fff3c4' : '#5a4a22');
      g.addColorStop(1, on ? '#ffae1a' : '#2d240f');
      c.fillStyle = g;
      if (on) { c.shadowColor = '#ffb020'; c.shadowBlur = 40; }
      c.beginPath(); c.arc(LAMP.x, LAMP.y, LAMP.r, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    };
    on ? glow(ui, ctx, lampDraw) : lampDraw(ctx);
    text(ctx, 'SEÑAL', 230, 108, { size: 22, color: 'rgba(0,0,0,0.55)' });
    // escala de frecuencias
    const x0 = 128, x1 = 384, sy = 182;
    ctx.strokeStyle = '#1b1c18';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x1, sy); ctx.stroke();
    for (let i = 0; i < MORSE_WORDS.length; i++) {
      const x = x0 + ((x1 - x0) * i) / (MORSE_WORDS.length - 1);
      ctx.beginPath(); ctx.moveTo(x, sy - (i % 5 === 0 ? 12 : 7)); ctx.lineTo(x, sy); ctx.stroke();
    }
    const mx = x0 + ((x1 - x0) * view.freq) / (MORSE_WORDS.length - 1);
    ctx.fillStyle = '#d9251b';
    rr(ctx, mx - 3, sy - 22, 6, 30, 2);
    ctx.fill();
    // display
    lcd(ctx, 122, 218, 268, 84, { color: '#160a03' });
    lcdText(ui, ctx, `${MORSE_WORDS[view.freq][1]} MHz`, 256, 262, { size: 44, color: '#ffb347' });
    arrow(ctx, 70, 260, 26, 'left', { hover: ui.hover === 'left', pressed: ui.pressed === 'left' });
    arrow(ctx, 442, 260, 26, 'right', { hover: ui.hover === 'right', pressed: ui.pressed === 'right' });
    const off = keycap(ctx, 176, 352, 160, 96, { pressed: ui.pressed === 'tx', hover: ui.hover === 'tx' });
    text(ctx, 'TX', 256, 396 + off, { size: 44, color: '#1d1b16' });
    engraved(ctx, 'CÓDIGO MORSE', 256, 482, 14);
  },
  press(id, view, ui) {
    ui.audio[id === 'tx' ? 'click' : 'softClick']();
    return { type: id };
  },
};

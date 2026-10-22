import { plate, lcd, glow, rr, text, engraved, STENCIL } from './kit.js';

// Segmentos encendidos por carácter (a b c d e f g).
const SEGS = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
};

function segment(c, s, x, y, w, h, t) {
  const hh = h / 2;
  const poly = {
    a: [[x + t, y], [x + w - t, y], [x + w - 2 * t, y + t], [x + 2 * t, y + t]],
    d: [[x + 2 * t, y + h - t], [x + w - 2 * t, y + h - t], [x + w - t, y + h], [x + t, y + h]],
    g: [[x + t, y + hh], [x + 2 * t, y + hh - t / 2], [x + w - 2 * t, y + hh - t / 2], [x + w - t, y + hh], [x + w - 2 * t, y + hh + t / 2], [x + 2 * t, y + hh + t / 2]],
    f: [[x, y + t], [x + t, y + 2 * t], [x + t, y + hh - t], [x, y + hh - t / 2]],
    b: [[x + w, y + t], [x + w, y + hh - t / 2], [x + w - t, y + hh - t], [x + w - t, y + 2 * t]],
    e: [[x, y + hh + t / 2], [x + t, y + hh + t], [x + t, y + h - 2 * t], [x, y + h - t]],
    c: [[x + w, y + hh + t / 2], [x + w, y + h - t], [x + w - t, y + h - 2 * t], [x + w - t, y + hh + t]],
  }[s];
  c.beginPath();
  poly.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.closePath();
  c.fill();
}

export function sevenSeg(ui, ctx, str, x, y, { w = 64, h = 120, t = 12, gap = 16, on = '#ff2d1f', off = '#2a0805' } = {}) {
  let cx = x;
  for (const ch of str) {
    if (ch === ':' || ch === '.') {
      glow(ui, ctx, (c) => {
        c.fillStyle = on;
        c.shadowColor = on;
        c.shadowBlur = 16;
        if (ch === ':') { c.fillRect(cx + 2, y + h * 0.28, t, t); }
        c.fillRect(cx + 2, y + h * (ch === ':' ? 0.66 : 0.9), t, t);
        c.shadowBlur = 0;
      });
      cx += t + gap;
      continue;
    }
    ctx.fillStyle = off;
    for (const s of 'abcdefg') segment(ctx, s, cx, y, w, h, t);
    const lit = SEGS[ch] || '';
    glow(ui, ctx, (c) => {
      c.fillStyle = on;
      c.shadowColor = on;
      c.shadowBlur = 16;
      for (const s of lit) segment(c, s, cx, y, w, h, t);
      c.shadowBlur = 0;
    });
    cx += w + gap;
  }
}

export const timerFace = {
  regions: () => [],
  animated: () => true,
  draw(ctx, view, ui) {
    plate(ctx, { tone: 'dark', led: false });
    // strikes
    const max = Math.max(1, view.strikesMax - 1);
    const sw = 72, sx = 256 - (max * sw + (max - 1) * 14) / 2;
    lcd(ctx, sx - 4, 78, max * sw + (max - 1) * 14 + 8, 64, { color: '#120403' });
    for (let i = 0; i < max; i++) {
      const x = sx + i * (sw + 14);
      const on = i < view.strikes;
      const draw = (c) => {
        c.font = `400 54px ${STENCIL}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = on ? '#ff2d1f' : '#2a0805';
        if (on) { c.shadowColor = '#ff2d1f'; c.shadowBlur = 16; }
        c.fillText('✕', x + sw / 2, 112);
        c.shadowBlur = 0;
      };
      on ? glow(ui, ctx, draw) : draw(ctx);
    }
    // reloj
    lcd(ctx, 36, 186, 440, 176, { color: '#0d0302' });
    // Siempre 4 dígitos y un separador (MM:SS o SS.cc).
    const totalW = 4 * 70 + 4 * 18 + 13;
    sevenSeg(ui, ctx, view.display, 256 - totalW / 2, 212, { w: 70, h: 124, t: 13, gap: 18 });
    engraved(ctx, 'COMMUNIBOMB · MK-II', 256, 410, 16);
    ctx.fillStyle = '#0d0e0c';
    rr(ctx, 176, 436, 160, 22, 6);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#2b2d29';
      ctx.fillRect(186 + i * 24, 442, 16, 10);
    }
  },
};

export const blankFace = {
  regions: () => [],
  draw(ctx) {
    plate(ctx, { tone: 'dark', led: false });
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, 120, 120, 272, 272, 20);
    ctx.fill();
    engraved(ctx, 'VACÍO', 256, 256, 20);
  },
};

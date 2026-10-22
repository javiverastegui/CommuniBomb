import { plate, COLORS, drawWire, glow, rr, text, SYMBOL, engraved } from './kit.js';

const X = (i) => 84 + i * 68;
const TOP = 112, BOTTOM = 404;
const COLOR_PAIRS = {
  white: [COLORS.white, null],
  red: [COLORS.red, null],
  blue: [COLORS.blue, null],
  redwhite: [COLORS.white, COLORS.red],
  bluewhite: [COLORS.white, COLORS.blue],
  redblue: [COLORS.red, COLORS.blue],
};

function points(i) {
  const x = X(i);
  const w = [8, -10, 6, -6, 10, -8][i];
  const pts = [];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    pts.push([x + Math.sin(t * Math.PI * 2) * w, TOP + (BOTTOM - TOP) * t]);
  }
  return pts;
}

export default {
  regions(view) {
    return view.wires.flatMap((w, i) => (w && !view.cut[i] ? [{ id: i, x: X(i) - 26, y: TOP, w: 52, h: BOTTOM - TOP }] : []));
  },
  draw(ctx, view, ui) {
    plate(ctx);
    ctx.fillStyle = '#1a1c18';
    rr(ctx, 46, 58, 360, 52, 10);
    ctx.fill();
    rr(ctx, 46, 404, 360, 80, 10);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const x = X(i);
      const w = view.wires[i];
      // LED
      const lit = w?.led;
      const led = (c) => {
        c.fillStyle = lit ? '#fff6d6' : '#3a3b36';
        if (lit) { c.shadowColor = '#ffe9a8'; c.shadowBlur = 18; }
        c.beginPath(); c.arc(x, 84, 13, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
      };
      lit ? glow(ui, ctx, led) : led(ctx);
      // conector superior e inferior
      ctx.fillStyle = '#8b8e86';
      rr(ctx, x - 12, TOP - 6, 24, 14, 3); ctx.fill();
      rr(ctx, x - 12, BOTTOM - 8, 24, 14, 3); ctx.fill();
      if (w) {
        const [base, stripe] = COLOR_PAIRS[w.color];
        drawWire(ctx, points(i), base, { stripe, hover: ui.hover === i, cut: view.cut[i], width: 14 });
      }
      // etiqueta con o sin estrella
      ctx.fillStyle = '#e9e5d6';
      rr(ctx, x - 26, 420, 52, 50, 4);
      ctx.fill();
      if (w?.star) text(ctx, '★', x, 446, { size: 36, font: SYMBOL, weight: 400, color: '#151515' });
    }
    engraved(ctx, 'CABLES COMPLICADOS', 210, 30, 13);
  },
  press(id, view, ui) {
    ui.audio.snip();
    return { type: 'cut', slot: id };
  },
};

import { plate, COLORS, drawWire, bezierPoints, rr, text, glow, keycap, engraved, STENCIL } from './kit.js';

const LY = [140, 250, 360];
const XL = 96, XR = 350;

function points(w) {
  const a = [XL, LY[w.from]], b = [XR, LY[w.to]];
  return bezierPoints(a, [XL + 110, a[1]], [XR - 110, b[1]], b, 40);
}

export default {
  regions(view) {
    const r = view.wires.flatMap((w, i) => (w.cut ? [] : [{ id: i, path: points(w), width: 16 }]));
    r.push({ id: 'next', x: 408, y: 352, w: 80, h: 96 });
    return r;
  },
  draw(ctx, view, ui) {
    plate(ctx);
    ctx.fillStyle = '#1a1c18';
    rr(ctx, 34, 92, 360, 316, 12);
    ctx.fill();
    LY.forEach((y, i) => {
      text(ctx, String(i + 1), 58, y, { size: 36, font: STENCIL, weight: 400, color: '#e9e5d6' });
      text(ctx, 'ABC'[i], 372, y, { size: 36, font: STENCIL, weight: 400, color: '#e9e5d6' });
      for (const x of [XL, XR]) {
        ctx.fillStyle = '#8b8e86';
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b2d29';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    });
    view.wires.forEach((w, i) => {
      drawWire(ctx, points(w), COLORS[w.color], { hover: ui.hover === i, cut: w.cut, width: 12 });
    });
    // indicador de panel
    for (let p = 0; p < 4; p++) {
      const y = 130 + p * 52;
      ctx.fillStyle = '#121310';
      rr(ctx, 420, y, 56, 40, 6);
      ctx.fill();
      const on = p === view.panel;
      const draw = (c) => {
        c.font = `400 26px ${STENCIL}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = on ? '#ffb347' : '#3a3229';
        c.fillText(String(p + 1), 448, y + 21);
      };
      on ? glow(ui, ctx, draw) : draw(ctx);
    }
    const off = keycap(ctx, 408, 352, 80, 96, { pressed: ui.pressed === 'next', hover: ui.hover === 'next' });
    text(ctx, '▼', 448, 396 + off, { size: 40, color: '#1d1b16' });
    engraved(ctx, 'SECUENCIA DE CABLES', 214, 440, 14);
  },
  press(id, view, ui) {
    if (id === 'next') { ui.audio.click(); return { type: 'next' }; }
    ui.audio.snip();
    return { type: 'cut', index: id };
  },
};

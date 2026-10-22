import { plate, keycap, rr, glow, text, SYMBOL, engraved } from './kit.js';

const KEYS = [[84, 112], [262, 112], [84, 290], [262, 290]];
const SIZE = 160;

export default {
  regions() {
    return KEYS.map(([x, y], i) => ({ id: i, x, y, w: SIZE, h: SIZE }));
  },
  animated: (view, ui) => ui.t - (ui.strikeAt || -9) < 1,
  draw(ctx, view, ui) {
    plate(ctx);
    ctx.fillStyle = '#1a1c18';
    rr(ctx, 66, 94, 374, 374, 14);
    ctx.fill();
    KEYS.forEach(([x, y], i) => {
      const pressed = view.pressed[i] || ui.pressed === i;
      const off = keycap(ctx, x, y, SIZE, SIZE, { pressed, hover: ui.hover === i && !view.pressed[i] });
      // ventanita LED
      const lx = x + SIZE / 2 - 26, ly = y + 14 + off;
      ctx.fillStyle = '#111';
      rr(ctx, lx, ly, 52, 12, 4);
      ctx.fill();
      const wrong = ui.local.last === i && ui.t - (ui.strikeAt || -9) < 1;
      if (view.pressed[i] || wrong) {
        const c = wrong ? '#ff3b2f' : '#4dff7a';
        glow(ui, ctx, (g) => {
          g.fillStyle = c;
          g.shadowColor = c;
          g.shadowBlur = 12;
          rr(g, lx + 3, ly + 3, 46, 6, 3);
          g.fill();
          g.shadowBlur = 0;
        });
      }
      text(ctx, view.symbols[i], x + SIZE / 2, y + SIZE / 2 + 14 + off, { size: 84, font: SYMBOL, weight: 400, color: '#1d1b16' });
    });
    engraved(ctx, 'TECLADO', 256, 488, 14);
  },
  press(id, view, ui) {
    if (view.pressed[id]) return null;
    ui.local.last = id;
    ui.audio.click();
    return { type: 'press', index: id };
  },
};

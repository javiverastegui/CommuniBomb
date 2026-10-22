import { plate, lcd, lcdText, keycap, text, rr, glow, engraved } from './kit.js';

const BTN = [[56, 188], [236, 188], [56, 278], [236, 278], [56, 368], [236, 368]];
const BW = 164, BH = 72;

export function stageBars(ui, ctx, x, y0, h, count, done) {
  ctx.fillStyle = '#121310';
  rr(ctx, x - 8, y0 - 8, 52, h + 16, 8);
  ctx.fill();
  const bh = (h - (count - 1) * 8) / count;
  for (let i = 0; i < count; i++) {
    const y = y0 + h - (i + 1) * bh - i * 8;
    const on = i < done;
    ctx.fillStyle = '#23261f';
    rr(ctx, x, y, 36, bh, 4);
    ctx.fill();
    if (on) glow(ui, ctx, (c) => {
      c.fillStyle = '#4dff7a';
      c.shadowColor = '#4dff7a';
      c.shadowBlur = 10;
      rr(c, x + 4, y + 4, 28, bh - 8, 3);
      c.fill();
      c.shadowBlur = 0;
    });
  }
}

export default {
  regions() {
    return BTN.map(([x, y], i) => ({ id: i, x, y, w: BW, h: BH }));
  },
  draw(ctx, view, ui) {
    plate(ctx);
    lcd(ctx, 70, 64, 300, 92, { color: '#081a1f' });
    if (view.display) lcdText(ui, ctx, view.display, 220, 112, { size: 52, color: '#bdf4ff', maxWidth: 270 });
    BTN.forEach(([x, y], i) => {
      const off = keycap(ctx, x, y, BW, BH, { pressed: ui.pressed === i, hover: ui.hover === i, r: 8 });
      text(ctx, view.labels[i], x + BW / 2, y + BH / 2 - 2 + off, { size: 26, maxWidth: BW - 20, color: '#1d1b16' });
    });
    stageBars(ui, ctx, 418, 188, 252, 3, view.stage + (ui.solved ? 1 : 0));
    engraved(ctx, '¿QUIÉN VA PRIMERO?', 220, 470, 14);
  },
  press(id, view, ui) {
    ui.audio.click();
    return { type: 'press', index: id };
  },
};

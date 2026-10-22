import { plate, lcd, lcdText, keycap, text, STENCIL, engraved } from './kit.js';
import { stageBars } from './who.js';

const KEYS = [0, 1, 2, 3].map((i) => [58 + i * 88, 226]);
const KW = 76, KH = 200;

export default {
  regions() {
    return KEYS.map(([x, y], i) => ({ id: i, x, y, w: KW, h: KH }));
  },
  draw(ctx, view, ui) {
    plate(ctx);
    lcd(ctx, 96, 62, 248, 124, { color: '#081a10' });
    lcdText(ui, ctx, String(view.display), 220, 128, { size: 104, font: STENCIL, weight: 400 });
    KEYS.forEach(([x, y], i) => {
      const off = keycap(ctx, x, y, KW, KH, { pressed: ui.pressed === i, hover: ui.hover === i, r: 8 });
      text(ctx, String(view.labels[i]), x + KW / 2, y + KH / 2 - 4 + off, { size: 64, font: STENCIL, weight: 400, color: '#1d1b16' });
    });
    stageBars(ui, ctx, 418, 120, 330, 5, view.stage + (ui.solved ? 1 : 0));
    engraved(ctx, 'MEMORIA', 220, 470, 14);
  },
  press(id, view, ui) {
    ui.audio.click();
    return { type: 'press', index: id };
  },
};

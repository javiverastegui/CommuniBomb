import { plate, lcd, lcdText, arrow, keycap, text, engraved, STENCIL } from './kit.js';

const X = (i) => 92 + i * 82;
const WIN = { y: 190, h: 104, w: 66 };

export default {
  regions() {
    const r = [];
    for (let i = 0; i < 5; i++) {
      r.push({ id: `up${i}`, x: X(i) - 34, y: 124, w: 68, h: 58 });
      r.push({ id: `down${i}`, x: X(i) - 34, y: 302, w: 68, h: 58 });
    }
    r.push({ id: 'submit', x: 156, y: 390, w: 200, h: 78 });
    return r;
  },
  draw(ctx, view, ui) {
    plate(ctx);
    lcd(ctx, 50, WIN.y, 412, WIN.h, { color: '#0a1a0c' });
    for (let i = 0; i < 5; i++) {
      const x = X(i);
      if (i) {
        ctx.fillStyle = '#050a06';
        ctx.fillRect(x - 41, WIN.y, 2, WIN.h);
      }
      lcdText(ui, ctx, view.cols[i][view.idx[i]], x, WIN.y + WIN.h / 2 + 4, { size: 74, font: STENCIL, weight: 400 });
      arrow(ctx, x, 154, 22, 'up', { hover: ui.hover === `up${i}`, pressed: ui.pressed === `up${i}` });
      arrow(ctx, x, 332, 22, 'down', { hover: ui.hover === `down${i}`, pressed: ui.pressed === `down${i}` });
    }
    const off = keycap(ctx, 156, 390, 200, 78, { pressed: ui.pressed === 'submit', hover: ui.hover === 'submit' });
    text(ctx, 'ENVIAR', 256, 426 + off, { size: 32, color: '#1d1b16' });
    engraved(ctx, 'CONTRASEÑA', 220, 76, 14);
  },
  press(id, view, ui) {
    if (id === 'submit') { ui.audio.click(); return { type: 'submit' }; }
    ui.audio.softClick();
    return { type: id.startsWith('up') ? 'up' : 'down', col: Number(id.slice(-1)) };
  },
};

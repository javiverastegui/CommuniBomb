import { plate, arrow, glow, rr } from './kit.js';

const O = 92, C = 54;
const cell = (i) => [O + (i % 6) * C + C / 2, O + Math.floor(i / 6) * C + C / 2];
const ARROWS = { N: [256, 50, 'up'], S: [256, 464, 'down'], W: [48, 256, 'left'], E: [464, 256, 'right'] };

export default {
  regions() {
    return Object.entries(ARROWS).map(([id, [cx, cy]]) => ({ id, cx, cy, r: 36 }));
  },
  draw(ctx, view, ui) {
    plate(ctx);
    ctx.fillStyle = '#0b0c0a';
    rr(ctx, O - 12, O - 12, C * 6 + 24, C * 6 + 24, 10);
    ctx.fill();
    ctx.fillStyle = '#0a1a10';
    rr(ctx, O - 4, O - 4, C * 6 + 8, C * 6 + 8, 6);
    ctx.fill();
    for (let i = 0; i < 36; i++) {
      const [x, y] = cell(i);
      ctx.fillStyle = '#1f3a28';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    glow(ui, ctx, (c) => {
      c.strokeStyle = '#3dff8a';
      c.lineWidth = 5;
      c.shadowColor = '#3dff8a';
      c.shadowBlur = 10;
      for (const i of view.circles) {
        const [x, y] = cell(i);
        c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.stroke();
      }
      const [gx, gy] = cell(view.goal);
      c.fillStyle = '#ff3b2f';
      c.shadowColor = '#ff3b2f';
      c.beginPath(); c.moveTo(gx, gy - 15); c.lineTo(gx + 14, gy + 11); c.lineTo(gx - 14, gy + 11); c.closePath(); c.fill();
      const [px, py] = cell(view.pos);
      c.fillStyle = '#ffffff';
      c.shadowColor = '#ffffff';
      c.fillRect(px - 11, py - 11, 22, 22);
      c.shadowBlur = 0;
    });
    for (const [id, [x, y, dir]] of Object.entries(ARROWS)) {
      arrow(ctx, x, y, 24, dir, { hover: ui.hover === id, pressed: ui.pressed === id });
    }
  },
  press(id, view, ui) {
    ui.audio.softClick();
    return { type: 'move', dir: id };
  },
  key(key) {
    return { ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E', w: 'N', s: 'S', a: 'W', d: 'E' }[key] || null;
  },
};

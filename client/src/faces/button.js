import { plate, COLORS, rr, glow, text, STENCIL, shade, engraved } from './kit.js';
import { HOLD_THRESHOLD_MS } from '@shared/modules/button.js';

const CX = 222, CY = 282, R = 126;
const STRIP = { x: 410, y: 150, w: 50, h: 270 };

export default {
  regions() {
    return [{ id: 'btn', cx: CX, cy: CY, r: R + 6 }];
  },
  animated: (view) => view.pressed,
  draw(ctx, view, ui) {
    plate(ctx);
    const pressed = ui.pressed === 'btn' || view.pressed;
    const hover = ui.hover === 'btn';
    // carcasa
    ctx.fillStyle = '#121310';
    ctx.beginPath(); ctx.arc(CX, CY, R + 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hover ? '#f2b705' : '#555a52';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(CX, CY, R + 16, 0, Math.PI * 2); ctx.stroke();
    // botón
    const col = COLORS[view.color];
    const r = pressed ? R - 6 : R;
    ctx.fillStyle = shade(col, -0.5);
    ctx.beginPath(); ctx.arc(CX, CY + (pressed ? 3 : 9), r, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(CX - 40, CY - 50, 10, CX, CY, r);
    g.addColorStop(0, shade(col, pressed ? 0.1 : 0.35));
    g.addColorStop(1, shade(col, pressed ? -0.3 : -0.1));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, CY + (pressed ? 3 : 0), r, 0, Math.PI * 2); ctx.fill();
    const dark = view.color === 'white' || view.color === 'yellow';
    text(ctx, view.label, CX, CY + (pressed ? 5 : 2), {
      size: 48, font: STENCIL, weight: 400, color: dark ? '#1b1b1b' : '#f3f1e8', maxWidth: r * 1.7,
    });
    // tira LED
    ctx.fillStyle = '#0d0e0c';
    rr(ctx, STRIP.x - 6, STRIP.y - 6, STRIP.w + 12, STRIP.h + 12, 10);
    ctx.fill();
    ctx.fillStyle = '#20231f';
    rr(ctx, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 6);
    ctx.fill();
    const heldLong = view.pressed && ui.local.downAt && performance.now() - ui.local.downAt >= HOLD_THRESHOLD_MS;
    if (heldLong && view.strip) {
      const sc = COLORS[view.strip];
      glow(ui, ctx, (c) => {
        c.fillStyle = sc;
        c.shadowColor = sc;
        c.shadowBlur = 20;
        rr(c, STRIP.x + 4, STRIP.y + 4, STRIP.w - 8, STRIP.h - 8, 4);
        c.fill();
        c.shadowBlur = 0;
      });
    }
    engraved(ctx, 'EL BOTÓN', 256, 472, 16);
  },
  press(id, view, ui) {
    ui.local.downAt = performance.now();
    ui.audio.click();
    return { type: 'press' };
  },
  release(id, view, ui) {
    const heldMs = performance.now() - (ui.local.downAt || performance.now());
    ui.audio.softClick();
    return { type: 'release', heldMs, timer: ui.timerString() };
  },
};

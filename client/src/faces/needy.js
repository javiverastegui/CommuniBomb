import { plate, needyTimer, keycap, lcd, lcdText, text, rr, glow, engraved, STENCIL, MONO } from './kit.js';
import { CAPACITOR_MAX } from '@shared/modules/capacitor.js';
import { VENT_QUESTIONS } from '@shared/modules/vent.js';

// ---------- Perilla ----------
const KNOB = { x: 256, y: 246, r: 84 };
const LED_X = [52, 98, 144, 368, 414, 460];

export const knob = {
  regions: () => [{ id: 'knob', cx: KNOB.x, cy: KNOB.y, r: KNOB.r + 12 }],
  animated: () => true,
  draw(ctx, view, ui) {
    plate(ctx, { needy: true });
    needyTimer(ui, ctx, view);
    text(ctx, 'ARRIBA', KNOB.x, 136, { size: 22, font: STENCIL, weight: 400, color: '#e9e5d6' });
    ctx.fillStyle = '#121310';
    ctx.beginPath(); ctx.arc(KNOB.x, KNOB.y, KNOB.r + 18, 0, Math.PI * 2); ctx.fill();
    // ángulo animado
    const target = view.pos * (Math.PI / 2);
    if (ui.local.angle === undefined) ui.local.angle = target;
    let diff = target - ui.local.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    ui.local.angle += diff * 0.25;
    ctx.save();
    ctx.translate(KNOB.x, KNOB.y);
    ctx.rotate(ui.local.angle);
    for (let k = 0; k < 24; k++) {
      ctx.rotate(Math.PI / 12);
      ctx.fillStyle = '#2a2c28';
      ctx.fillRect(-6, -KNOB.r - 6, 12, 12);
    }
    const g = ctx.createRadialGradient(-20, -24, 8, 0, 0, KNOB.r);
    g.addColorStop(0, '#6c6f68');
    g.addColorStop(1, '#262824');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, KNOB.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9e5d6';
    rr(ctx, -6, -KNOB.r + 8, 12, 52, 4);
    ctx.fill();
    ctx.restore();
    if (ui.hover === 'knob') {
      ctx.strokeStyle = '#f2b705';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(KNOB.x, KNOB.y, KNOB.r + 20, 0, Math.PI * 2); ctx.stroke();
    }
    const leds = view.active && view.leds ? view.leds : '000000000000';
    for (let row = 0; row < 2; row++) {
      for (let c = 0; c < 6; c++) {
        const on = leds[row * 6 + c] === '1';
        const x = LED_X[c], y = 396 + row * 50;
        const draw = (cx) => {
          cx.fillStyle = on ? '#b6ff6a' : '#2b3122';
          if (on) { cx.shadowColor = '#b6ff6a'; cx.shadowBlur = 14; }
          cx.beginPath(); cx.arc(x, y, 15, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;
        };
        ctx.fillStyle = '#0d0e0c';
        ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
        on ? glow(ui, ctx, draw) : draw(ctx);
      }
    }
  },
  press(id, view, ui) {
    ui.audio.click();
    return { type: 'turn' };
  },
};

// ---------- Ventilar gas ----------
export const vent = {
  regions: () => [
    { id: 'yes', x: 92, y: 352, w: 150, h: 88 },
    { id: 'no', x: 270, y: 352, w: 150, h: 88 },
  ],
  animated: (view) => view.active,
  draw(ctx, view, ui) {
    plate(ctx, { needy: true });
    needyTimer(ui, ctx, view);
    lcd(ctx, 50, 128, 412, 180, { color: '#06140b' });
    if (view.active) {
      if (view.message) {
        lcdText(ui, ctx, 'VENTILAR EVITA', 256, 196, { size: 34 });
        lcdText(ui, ctx, 'EXPLOSIONES', 256, 244, { size: 34 });
      } else {
        lcdText(ui, ctx, VENT_QUESTIONS[view.question] || '', 256, 196, { size: 40, maxWidth: 380 });
        lcdText(ui, ctx, 'SÍ / NO', 256, 256, { size: 30, color: ui.t % 1 < 0.5 ? '#9dffb8' : '#3c7a52' });
      }
    }
    for (const [id, label, x] of [['yes', 'SÍ', 92], ['no', 'NO', 270]]) {
      const off = keycap(ctx, x, 352, 150, 88, { pressed: ui.pressed === id, hover: ui.hover === id });
      text(ctx, label, x + 75, 392 + off, { size: 40, color: '#1d1b16' });
    }
  },
  press(id, view, ui) {
    ui.audio.click();
    return { type: id };
  },
};

// ---------- Descarga de capacitor ----------
const LEVER = { x: 316, y: 120, w: 140, h: 360 };

export const capacitor = {
  regions: () => [{ id: 'lever', ...LEVER }],
  animated: (view) => view.active,
  draw(ctx, view, ui) {
    plate(ctx, { needy: true });
    needyTimer(ui, ctx, view);
    // capacitor
    const cx = 60, cy = 132, cw = 190, ch = 320;
    const body = ctx.createLinearGradient(cx, 0, cx + cw, 0);
    body.addColorStop(0, '#163a6b');
    body.addColorStop(0.45, '#3f74c4');
    body.addColorStop(1, '#10284d');
    ctx.fillStyle = '#0d0e0c';
    rr(ctx, cx - 6, cy - 6, cw + 12, ch + 12, 22);
    ctx.fill();
    ctx.fillStyle = body;
    rr(ctx, cx, cy, cw, ch, 18);
    ctx.fill();
    ctx.fillStyle = '#b8bcc4';
    rr(ctx, cx + 10, cy - 18, cw - 20, 22, 6);
    ctx.fill();
    text(ctx, '450V', cx + cw / 2, cy + 40, { size: 28, color: '#e9eefc', font: MONO });
    text(ctx, '⚡', cx + cw / 2, cy + 86, { size: 40, color: '#ffd84a', weight: 400 });
    // nivel de carga
    const t = view.active ? Math.max(0, view.timeLeft + view.rate * ui.age) : CAPACITOR_MAX;
    const charge = 1 - t / CAPACITOR_MAX;
    const bx = cx + 40, by = cy + 120, bw = cw - 80, bh = ch - 150;
    ctx.fillStyle = '#071223';
    rr(ctx, bx, by, bw, bh, 6);
    ctx.fill();
    if (charge > 0.01) {
      const col = charge > 0.75 ? '#ff4b36' : charge > 0.45 ? '#ffb347' : '#6aff9a';
      glow(ui, ctx, (c) => {
        c.fillStyle = col;
        c.shadowColor = col;
        c.shadowBlur = 12;
        rr(c, bx + 6, by + 6 + (bh - 12) * (1 - charge), bw - 12, (bh - 12) * charge, 4);
        c.fill();
        c.shadowBlur = 0;
      });
    }
    // palanca
    ctx.fillStyle = '#0d0e0c';
    rr(ctx, LEVER.x + 52, LEVER.y + 10, 36, LEVER.h - 20, 18);
    ctx.fill();
    const held = view.holding || ui.pressed === 'lever';
    const hy = held ? LEVER.y + LEVER.h - 92 : LEVER.y + 16;
    const hover = ui.hover === 'lever';
    ctx.fillStyle = '#3a3d37';
    rr(ctx, LEVER.x + 62, Math.min(hy + 30, LEVER.y + 40), 16, Math.abs(hy - LEVER.y - 40) + 30, 6);
    ctx.fill();
    keycap(ctx, LEVER.x + 8, hy, LEVER.w - 16, 72, { hover, face: '#c7392c', pressed: held });
    engraved(ctx, 'DESCARGAR', LEVER.x + LEVER.w / 2, LEVER.y + LEVER.h + 8, 14);
  },
  press(id, view, ui) {
    ui.audio.hum();
    return { type: 'hold' };
  },
  release(id, view, ui) {
    ui.audio.softClick();
    return { type: 'release' };
  },
};

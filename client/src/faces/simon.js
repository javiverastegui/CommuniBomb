import { plate, COLORS, glow, shade, rr, engraved } from './kit.js';

const CX = 248, CY = 282, OFF = 98, HALF = 66;
const LAYOUT = { blue: [0, -1], yellow: [1, 0], green: [0, 1], red: [-1, 0] };
const STEP = 0.75, ON = 0.45, PAUSE = 2.6, QUIET_AFTER_INPUT = 3.2;

function centers() {
  return Object.entries(LAYOUT).map(([c, [dx, dy]]) => [c, CX + dx * OFF, CY + dy * OFF]);
}

// Color que parpadea ahora (o null) según la secuencia visible.
function flashing(view, ui) {
  if (ui.solved) return null;
  if (ui.local.lastInput && ui.t - ui.local.lastInput < QUIET_AFTER_INPUT) return null;
  const n = view.flashes.length;
  const phase = ui.t % (n * STEP + PAUSE);
  const i = Math.floor(phase / STEP);
  if (i >= n || phase - i * STEP > ON) return null;
  const key = `${Math.floor(ui.t / (n * STEP + PAUSE))}:${i}`;
  if (ui.local.interacted && ui.local.lastKey !== key) {
    ui.local.lastKey = key;
    ui.audio.simon(view.flashes[i]);
  }
  return view.flashes[i];
}

export default {
  regions() {
    return centers().map(([id, cx, cy]) => ({ id, cx, cy, r: HALF * 1.2 }));
  },
  animated: () => true,
  draw(ctx, view, ui) {
    plate(ctx, { tone: 'dark' });
    ctx.fillStyle = '#0f100e';
    ctx.beginPath(); ctx.arc(CX, CY, OFF + HALF + 26, 0, Math.PI * 2); ctx.fill();
    const lit = flashing(view, ui);
    const localLit = ui.local.flash && ui.t - ui.local.flash.at < 0.3 ? ui.local.flash.color : null;
    for (const [color, cx, cy] of centers()) {
      const on = color === lit || color === localLit;
      const base = COLORS[color];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = shade(base, -0.6);
      rr(ctx, -HALF, -HALF + 5, HALF * 2, HALF * 2, 14);
      ctx.fill();
      ctx.restore();
      const draw = (c) => {
        c.save();
        c.translate(cx, cy);
        c.rotate(Math.PI / 4);
        c.fillStyle = on ? shade(base, 0.45) : shade(base, -0.35);
        if (on) { c.shadowColor = base; c.shadowBlur = 40; }
        rr(c, -HALF, -HALF, HALF * 2, HALF * 2, 14);
        c.fill();
        c.restore();
      };
      on ? glow(ui, ctx, draw) : draw(ctx);
      if (ui.hover === color) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = '#f2b705';
        ctx.lineWidth = 4;
        rr(ctx, -HALF - 3, -HALF - 3, HALF * 2 + 6, HALF * 2 + 6, 16);
        ctx.stroke();
        ctx.restore();
      }
    }
    engraved(ctx, 'SIMÓN', 256, 488, 14);
  },
  press(color, view, ui) {
    ui.local.interacted = true;
    ui.local.lastInput = ui.t;
    ui.local.flash = { color, at: ui.t };
    ui.audio.simon(color);
    return { type: 'press', color };
  },
};

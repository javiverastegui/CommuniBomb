import { plate, bezierPoints, drawWire, COLORS, rr, engraved } from './kit.js';

const Y0 = 112, DY = 58, XL = 74, XR = 438;

function wirePoints(slot) {
  const y = Y0 + slot * DY;
  const wob = [14, -18, 10, -12, 20, -8][slot];
  return bezierPoints([XL, y], [XL + 130, y + wob], [XR - 130, y - wob * 0.8], [XR, y], 48);
}

function terminals(ctx, x) {
  ctx.fillStyle = '#1a1c18';
  rr(ctx, x - 22, Y0 - 34, 44, DY * 5 + 68, 8);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const y = Y0 + i * DY;
    ctx.fillStyle = '#8b8e86';
    rr(ctx, x - 14, y - 12, 28, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#2b2d29';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }
}

export default {
  regions(view) {
    return view.wires.flatMap((c, s) => (c && !view.cut[s] ? [{ id: s, path: wirePoints(s), width: 18 }] : []));
  },
  draw(ctx, view, ui) {
    plate(ctx);
    engraved(ctx, 'CABLES', 256, 470, 16);
    terminals(ctx, XL);
    terminals(ctx, XR);
    view.wires.forEach((c, s) => {
      if (!c) return;
      drawWire(ctx, wirePoints(s), COLORS[c], { hover: ui.hover === s, cut: view.cut[s] });
    });
  },
  press(id, view, ui) {
    ui.audio.snip();
    return { type: 'cut', slot: id };
  },
};

// Utilidades de dibujo para las caras de los módulos (canvas de 512×512).
export const PX = 512;
export const LED_POS = { x: 456, y: 56 };
export const MONO = '"JetBrains Mono", ui-monospace, monospace';
export const STENCIL = '"Saira Stencil One", Impact, sans-serif';
export const SYMBOL = '"Segoe UI Symbol", "DejaVu Sans", "Arial Unicode MS", "Noto Sans Symbols", sans-serif';

export const COLORS = {
  red: '#c8281f', white: '#ece9dd', blue: '#1f5fd8', yellow: '#f3c414', black: '#1b1b1b', green: '#21a54a',
};

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Dibuja también en la capa emisiva (lo que brilla con bloom).
export function glow(ui, ctx, fn) {
  fn(ctx);
  if (ui.glowCtx) fn(ui.glowCtx);
}

let brushed = null;
function brushedPattern() {
  if (brushed) return brushed;
  brushed = document.createElement('canvas');
  brushed.width = brushed.height = PX;
  const b = brushed.getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * PX;
    b.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`;
    b.lineWidth = Math.random() * 1.4;
    b.beginPath();
    const x = Math.random() * PX;
    b.moveTo(x - 80, y);
    b.lineTo(x + 80 + Math.random() * 120, y + (Math.random() - 0.5));
    b.stroke();
  }
  return brushed;
}

function screw(ctx, x, y) {
  const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
  g.addColorStop(0, '#c9ccc2');
  g.addColorStop(1, '#4a4d46');
  ctx.fillStyle = '#0006';
  ctx.beginPath(); ctx.arc(x + 1, y + 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2c27';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x + 6, y + 4); ctx.stroke();
}

// Placa base de un módulo. `needy` añade la franja de peligro.
export function plate(ctx, { needy = false, tone = 'steel', led = true } = {}) {
  const base = tone === 'dark' ? ['#2f332d', '#1f221d'] : ['#5f665c', '#3f453c'];
  const g = ctx.createLinearGradient(0, 0, PX, PX);
  g.addColorStop(0, base[0]);
  g.addColorStop(1, base[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PX, PX);
  ctx.drawImage(brushedPattern(), 0, 0);
  // bisel
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.strokeRect(5, 5, PX - 10, PX - 10);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeRect(2, 2, PX - 4, PX - 4);
  if (needy) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(14, 14, PX - 28, 14);
    ctx.clip();
    for (let x = -20; x < PX; x += 28) {
      ctx.fillStyle = '#f2b705';
      ctx.beginPath();
      ctx.moveTo(x, 28); ctx.lineTo(x + 14, 14); ctx.lineTo(x + 28, 14); ctx.lineTo(x + 14, 28);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const [x, y] of [[26, 26], [PX - 26, PX - 26], [26, PX - 26]]) screw(ctx, x, y);
  if (led) {
    // casquillo del LED de estado (la esfera 3D se coloca encima)
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(LED_POS.x, LED_POS.y, 26, 0, Math.PI * 2); ctx.fill();
    const rg = ctx.createRadialGradient(LED_POS.x, LED_POS.y, 14, LED_POS.x, LED_POS.y, 26);
    rg.addColorStop(0, '#222');
    rg.addColorStop(1, '#666');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(LED_POS.x, LED_POS.y, 23, 0, Math.PI * 2); ctx.stroke();
  } else screw(ctx, PX - 26, 26);
}

export function lcd(ctx, x, y, w, h, { color = '#06140b', r = 6 } = {}) {
  ctx.fillStyle = '#0b0c0a';
  rr(ctx, x - 6, y - 6, w + 12, h + 12, r + 4);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.18, 'rgba(0,0,0,0)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
}

export function lcdText(ui, ctx, text, x, y, { size = 48, color = '#9dffb8', font = MONO, weight = 700, maxWidth = 0, align = 'center' } = {}) {
  glow(ui, ctx, (c) => {
    c.font = `${weight} ${size}px ${font}`;
    if (maxWidth) {
      let s = size;
      while (c.measureText(text).width > maxWidth && s > 12) c.font = `${weight} ${--s}px ${font}`;
    }
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 14;
    c.fillText(text, x, y);
    c.shadowBlur = 0;
  });
}

export function keycap(ctx, x, y, w, h, { pressed = false, hover = false, face = '#d9d1b9', r = 10 } = {}) {
  const depth = pressed ? 2 : 7;
  ctx.fillStyle = '#0e0f0c';
  rr(ctx, x - 4, y - 4, w + 8, h + 8, r + 3);
  ctx.fill();
  ctx.fillStyle = shade(face, -0.45);
  rr(ctx, x, y + depth, w, h - depth, r);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h - depth);
  g.addColorStop(0, shade(face, hover ? 0.12 : 0.05));
  g.addColorStop(1, shade(face, hover ? -0.05 : -0.12));
  ctx.fillStyle = g;
  rr(ctx, x, y + (pressed ? 4 : 0), w, h - depth, r);
  ctx.fill();
  if (hover) {
    ctx.strokeStyle = 'rgba(242,183,5,0.85)';
    ctx.lineWidth = 3;
    rr(ctx, x - 2, y - 2 + (pressed ? 4 : 0), w + 4, h - depth + 4, r + 2);
    ctx.stroke();
  }
  return pressed ? 4 : 0;
}

export function text(ctx, str, x, y, { size = 28, color = '#111', font = MONO, weight = 800, maxWidth = 0, align = 'center' } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  if (maxWidth) {
    let s = size;
    while (ctx.measureText(str).width > maxWidth && s > 10) ctx.font = `${weight} ${--s}px ${font}`;
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function engraved(ctx, str, x, y, size = 18) {
  text(ctx, str, x, y + 1, { size, color: 'rgba(255,255,255,0.12)', weight: 700 });
  text(ctx, str, x, y, { size, color: 'rgba(0,0,0,0.55)', weight: 700 });
}

export function arrow(ctx, cx, cy, size, dir, { hover = false, pressed = false } = {}) {
  const ang = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI }[dir];
  ctx.save();
  ctx.translate(cx, cy + (pressed ? 2 : 0));
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.85);
  ctx.lineTo(-size * 0.7, size * 0.85);
  ctx.closePath();
  ctx.fillStyle = '#000a';
  ctx.translate(0, 3);
  ctx.fill();
  ctx.translate(0, -3);
  ctx.fillStyle = hover ? '#f4e9c4' : '#d2cbb3';
  ctx.fill();
  ctx.strokeStyle = hover ? '#f2b705' : '#00000055';
  ctx.lineWidth = hover ? 3 : 2;
  ctx.stroke();
  ctx.restore();
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  r = f(r); g = f(g); b = f(b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Pantalla de dos dígitos de los módulos de necesidad.
export function needyTimer(ui, ctx, view) {
  const x = 196, y = 40, w = 120, h = 62;
  lcd(ctx, x, y, w, h, { color: '#140504' });
  ctx.font = `700 46px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a0b08';
  ctx.fillText('88', x + w / 2, y + h / 2 + 2);
  if (!view.active) return;
  const t = Math.max(0, Math.ceil(view.timeLeft + view.rate * ui.age));
  lcdText(ui, ctx, String(Math.min(t, 99)).padStart(2, '0'), x + w / 2, y + h / 2 + 2, { size: 46, color: t <= 10 && (ui.t % 0.5 < 0.25) ? '#ff8a6a' : '#ff3b2f' });
}

// Detección de regiones: rectángulos, círculos o trazos.
export function hitTest(regions, x, y) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (r.path) {
      for (let k = 1; k < r.path.length; k++) {
        if (distSeg(x, y, r.path[k - 1], r.path[k]) <= r.width) return r.id;
      }
    } else if (r.r !== undefined) {
      if ((x - r.cx) ** 2 + (y - r.cy) ** 2 <= r.r ** 2) return r.id;
    } else if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
  }
  return null;
}

function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function bezierPoints(p0, p1, p2, p3, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

export function strokePath(ctx, pts, from = 0, to = pts.length - 1) {
  ctx.beginPath();
  ctx.moveTo(pts[from][0], pts[from][1]);
  for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// Cable con contorno, color y brillo. `stripe` dibuja un segundo color a rayas.
export function drawWire(ctx, pts, color, { hover = false, cut = false, stripe = null, width = 13 } = {}) {
  const n = pts.length - 1;
  const parts = cut ? [[0, Math.floor(n * 0.44)], [Math.ceil(n * 0.56), n]] : [[0, n]];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [a, b] of parts) {
    if (hover) {
      ctx.strokeStyle = 'rgba(242,183,5,0.9)';
      ctx.lineWidth = width + 10;
      strokePath(ctx, pts, a, b);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = width + 4;
    ctx.save();
    ctx.translate(2, 5);
    strokePath(ctx, pts, a, b);
    ctx.restore();
    ctx.strokeStyle = color === COLORS.black ? '#3a3a3a' : shade(color, -0.4);
    ctx.lineWidth = width + 3;
    strokePath(ctx, pts, a, b);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    strokePath(ctx, pts, a, b);
    if (stripe) {
      ctx.strokeStyle = stripe;
      ctx.setLineDash([10, 12]);
      strokePath(ctx, pts, a, b);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3;
    ctx.save();
    ctx.translate(-1, -3);
    strokePath(ctx, pts, a, b);
    ctx.restore();
  }
  if (cut) {
    // puntas de cobre
    for (const i of [Math.floor(n * 0.44), Math.ceil(n * 0.56)]) {
      ctx.fillStyle = '#d58a3a';
      ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], width / 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

import * as THREE from 'three';
import { PORTS } from '@shared/edgework.js';
import { createRng } from '@shared/rng.js';

const MONO = '"JetBrains Mono", monospace';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function labelledBox(w, h, d, tex, sideColor = 0x1a1b18, opts = {}) {
  const side = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.6, metalness: 0.3 });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0.1 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, face, side]);
  mesh.position.z = d / 2;
  mesh.castShadow = true;
  return mesh;
}

function serialWidget(serial, W, H) {
  const tex = canvasTexture(512, 256, (c, w, h) => {
    c.fillStyle = '#f1eee2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c62a1f';
    c.fillRect(0, 0, w, 64);
    c.fillStyle = '#fff';
    c.font = `800 34px ${MONO}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Nº DE SERIE', w / 2, 34);
    c.fillStyle = '#141414';
    c.font = `800 104px ${MONO}`;
    c.fillText(serial, w / 2, 160);
    c.strokeStyle = '#0003';
    c.lineWidth = 6;
    c.strokeRect(3, 3, w - 6, h - 6);
  });
  const g = new THREE.Group();
  g.add(labelledBox(W * 0.92, H * 0.6, 0.012, tex, 0xe8e4d6, { roughness: 0.85 }));
  return g;
}

function indicatorWidget({ label, lit }, W, H) {
  const g = new THREE.Group();
  const tex = canvasTexture(512, 256, (c, w, h) => {
    c.fillStyle = '#121311';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ece9dd';
    c.font = `800 110px ${MONO}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, w * 0.62, h / 2 + 6);
    c.fillStyle = '#000';
    c.beginPath(); c.arc(w * 0.17, h / 2, 54, 0, Math.PI * 2); c.fill();
  });
  const plate = labelledBox(W * 0.86, H * 0.52, 0.05, tex);
  g.add(plate);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 24, 16),
    new THREE.MeshStandardMaterial({
      color: lit ? 0xffffff : 0x2a2a2a,
      emissive: lit ? 0xfff4d6 : 0x000000,
      emissiveIntensity: lit ? 1.5 : 0,
      roughness: 0.3,
    }),
  );
  led.position.set(-W * 0.86 * 0.5 + W * 0.86 * 0.17, 0, 0.06);
  g.add(led);
  return g;
}

function batteryWidget({ type }, W, H) {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.9, H * 0.66, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x151614, roughness: 0.8 }),
  );
  tray.position.z = 0.025;
  tray.castShadow = true;
  g.add(tray);
  const wrap = canvasTexture(256, 128, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#1b1b1b');
    grad.addColorStop(0.62, '#1b1b1b');
    grad.addColorStop(0.62, '#c9902a');
    grad.addColorStop(1, '#e2b24a');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  });
  wrap.wrapS = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.35, metalness: 0.5 });
  const tip = new THREE.MeshStandardMaterial({ color: 0xb8b8b0, metalness: 0.9, roughness: 0.25 });
  const cells = type === 'D' ? [{ r: 0.15, y: 0 }] : [{ r: 0.078, y: 0.1 }, { r: 0.078, y: -0.1 }];
  const len = W * 0.72;
  for (const { r, y } of cells) {
    const geo = new THREE.CylinderGeometry(r, r, len, 32, 1);
    // gira la UV para que la banda dorada quede en un extremo
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    const cell = new THREE.Mesh(geo, mat);
    cell.rotation.z = Math.PI / 2;
    cell.position.set(0, y, 0.05 + r);
    cell.castShadow = true;
    g.add(cell);
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.03, 16), tip);
    nub.rotation.z = Math.PI / 2;
    nub.position.set(len / 2 + 0.015, y, 0.05 + r);
    g.add(nub);
  }
  return g;
}

export function drawPort(c, id, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineWidth = 4;
  const trap = (w, h, col, pins) => {
    c.fillStyle = '#0c0c0c';
    c.beginPath();
    c.moveTo(-w / 2 - 8, -h / 2 - 8); c.lineTo(w / 2 + 8, -h / 2 - 8);
    c.lineTo(w / 2 - 6, h / 2 + 8); c.lineTo(-w / 2 + 6, h / 2 + 8); c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.lineTo(w / 2 - 10, h / 2); c.lineTo(-w / 2 + 10, h / 2); c.closePath(); c.fill();
    c.fillStyle = '#111';
    pins.forEach(([px, py]) => { c.beginPath(); c.arc(px, py, 4, 0, Math.PI * 2); c.fill(); });
  };
  const row = (n, w, py) => Array.from({ length: n }, (_, i) => [-w / 2 + (w * i) / (n - 1), py]);
  switch (id) {
    case 'parallel': trap(250, 52, '#c03c9a', [...row(13, 210, -10), ...row(12, 190, 12)]); break;
    case 'serial': trap(120, 50, '#2a8f8a', [...row(5, 80, -9), ...row(4, 62, 11)]); break;
    case 'dvi': {
      trap(170, 56, '#e9e6da', [...row(8, 110, -14), ...row(8, 110, 0), ...row(8, 110, 14)]);
      c.fillStyle = '#111';
      c.fillRect(64, -4, 18, 6);
      break;
    }
    case 'ps2': {
      c.fillStyle = '#0c0c0c'; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7a4fc0'; c.beginPath(); c.arc(0, 0, 32, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#111';
      for (let i = 0; i < 6; i++) { const a = Math.PI * (0.15 + i * 0.14) + Math.PI; c.beginPath(); c.arc(Math.cos(a) * 18, -Math.sin(a) * 18, 4, 0, Math.PI * 2); c.fill(); }
      c.fillRect(-6, 10, 12, 14);
      break;
    }
    case 'rj45': {
      c.fillStyle = '#0c0c0c'; c.fillRect(-46, -40, 92, 80);
      c.fillStyle = '#d8d6cc'; c.fillRect(-38, -32, 76, 64);
      c.fillStyle = '#111'; c.fillRect(-26, -20, 52, 44); c.fillRect(-12, 24, 24, 10);
      c.fillStyle = '#c89b3c';
      for (let i = 0; i < 8; i++) c.fillRect(-22 + i * 6, -18, 3, 12);
      break;
    }
    case 'rca': {
      for (const [dx, col] of [[-34, '#d42a1f'], [34, '#ece9dd']]) {
        c.fillStyle = '#0c0c0c'; c.beginPath(); c.arc(dx, 0, 30, 0, Math.PI * 2); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(dx, 0, 24, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#c8c8c0'; c.beginPath(); c.arc(dx, 0, 12, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#111'; c.beginPath(); c.arc(dx, 0, 5, 0, Math.PI * 2); c.fill();
      }
      break;
    }
  }
  c.restore();
}

function portWidget(ports, W, H) {
  const tex = canvasTexture(1024, 512, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#7d827a');
    grad.addColorStop(1, '#5a5f57');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    for (const [x, y] of [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]]) {
      c.fillStyle = '#2b2d29'; c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill();
    }
    if (!ports.length) {
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.font = `700 40px ${MONO}`;
      c.textAlign = 'center';
      c.fillText('PLACA VACÍA', w / 2, h / 2 + 12);
      return;
    }
    const n = ports.length;
    const cols = Math.min(n, 2);
    const rows = Math.ceil(n / cols);
    ports.forEach((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = (w / cols) * (col + 0.5);
      const cellH = (h - 40) / rows;
      const y = 20 + cellH * row + cellH * 0.4;
      drawPort(c, p, x, y, rows > 1 ? 1.25 : 1.6);
      c.fillStyle = '#121311';
      c.font = `800 ${rows > 1 ? 34 : 44}px ${MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(PORTS[p].toUpperCase(), x, y + cellH * 0.38);
    });
  });
  const g = new THREE.Group();
  g.add(labelledBox(W * 0.94, H * 0.8, 0.04, tex, 0x3e423b, { metalness: 0.45, roughness: 0.5 }));
  return g;
}

// Coloca los widgets en los cuatro costados de la carcasa.
export function buildWidgets(edgework, CASE) {
  const group = new THREE.Group();
  const slots = [];
  for (const x of [-1.1, 0, 1.1]) {
    slots.push({ pos: [x, CASE.h / 2, 0], rot: [-Math.PI / 2, 0, 0], W: 1.0, H: 0.86 });
    slots.push({ pos: [x, -CASE.h / 2, 0], rot: [Math.PI / 2, 0, 0], W: 1.0, H: 0.86 });
  }
  for (const y of [0.52, -0.52]) {
    slots.push({ pos: [-CASE.w / 2, y, 0], rot: [0, -Math.PI / 2, 0], W: 0.86, H: 0.94 });
    slots.push({ pos: [CASE.w / 2, y, 0], rot: [0, Math.PI / 2, 0], W: 0.86, H: 0.94 });
  }
  const seed = [...edgework.serial].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0;
  const order = createRng(seed).shuffle(slots);
  const widgets = [
    (W, H) => serialWidget(edgework.serial, W, H),
    ...edgework.batteries.map((b) => (W, H) => batteryWidget(b, W, H)),
    ...edgework.indicators.map((i) => (W, H) => indicatorWidget(i, W, H)),
    ...edgework.plates.map((p) => (W, H) => portWidget(p, W, H)),
  ];
  widgets.forEach((make, i) => {
    const s = order[i];
    if (!s) return;
    const holder = new THREE.Group();
    holder.position.set(...s.pos);
    holder.rotation.set(...s.rot);
    holder.add(make(s.W, s.H));
    group.add(holder);
  });
  return group;
}

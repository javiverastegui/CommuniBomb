import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FACES, timerFace, blankFace } from '../faces/index.js';
import { PX, LED_POS, hitTest } from '../faces/kit.js';
import { buildWidgets } from './widgets.js';
import { formatTimer } from '@shared/time.js';
import { TIMER_SLOT } from '@shared/bomb.js';
import { audio } from '../audio.js';

const CASE = { w: 3.44, h: 2.32, d: 1.2 };
const PITCH = 1.08;
const FACE = 0.92;
const FOV = 38;
const TWO_PI = Math.PI * 2;
const ANIM_STEP = 1 / 30; // las caras animadas se redibujan a 30 fps como máximo
const MAX_DPR = 1.5;
const MIN_DPR = 1;

function slotLocal(slot) {
  const back = slot >= 6;
  const i = slot % 6;
  const x = ((i % 3) - 1) * PITCH * (back ? -1 : 1);
  const y = (i < 3 ? 0.5 : -0.5) * PITCH;
  return { x, y, z: back ? -CASE.d / 2 : CASE.d / 2, back };
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#2a1a10';
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 1024;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '70,44,24' : '18,10,6'},${0.15 + Math.random() * 0.35})`;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 140 + i) * 6);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  t.anisotropy = 8;
  return t;
}

class Slot {
  constructor(bombView, slot, face, module) {
    this.face = face;
    this.module = module; // null para temporizador o tapa vacía
    this.slot = slot;
    this.view = null;
    this.dirty = true;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = PX;
    this.ctx = this.canvas.getContext('2d');
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = this.glowCanvas.height = PX;
    this.glowCtx = this.glowCanvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = bombView.renderer.capabilities.getMaxAnisotropy();
    this.glowTexture = new THREE.CanvasTexture(this.glowCanvas);
    this.glowTexture.colorSpace = THREE.SRGBColorSpace;

    this.ui = {
      t: 0, age: 0, hover: null, pressed: null, local: {}, strikeAt: null, solved: false,
      glowCtx: this.glowCtx, audio, timerString: () => bombView.timerString(),
    };

    const L = slotLocal(slot);
    this.group = new THREE.Group();
    this.group.position.set(L.x, L.y, L.z);
    if (L.back) this.group.rotation.y = Math.PI;

    this.housingMat = new THREE.MeshStandardMaterial({ color: 0x24272a, metalness: 0.7, roughness: 0.4 });
    const housing = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.0, 0.16, 3, 0.035), this.housingMat);
    housing.position.z = -0.045;
    housing.castShadow = true;
    housing.receiveShadow = true;
    this.group.add(housing);

    this.faceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(FACE, FACE),
      new THREE.MeshStandardMaterial({
        map: this.texture, emissive: 0xffffff, emissiveMap: this.glowTexture, emissiveIntensity: 1.8,
        roughness: 0.78, metalness: 0.05,
      }),
    );
    this.faceMesh.position.z = 0.0355;
    this.faceMesh.receiveShadow = true;
    this.faceMesh.userData.slot = this;
    this.group.add(this.faceMesh);

    if (module && !module.needy) {
      this.ledMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, emissive: 0x000000, roughness: 0.25, metalness: 0.1 });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.034, 24, 16), this.ledMat);
      led.position.set((LED_POS.x / PX - 0.5) * FACE, (0.5 - LED_POS.y / PX) * FACE, 0.045);
      this.group.add(led);
    }
  }

  get interactive() {
    return !!this.module && !this.ui.solved;
  }

  setView(view, solved) {
    this.view = view;
    this.ui.solved = !!solved;
    this.receivedAt = performance.now();
    this.dirty = true;
  }

  // `visible`: la cara mira hacia la cámara. Las ocultas no se redibujan; si
  // quedaron sucias, se pintan en cuanto vuelven a verse.
  render(t, visible) {
    if (!this.view) return;
    this.ui.t = t;
    this.ui.age = (performance.now() - (this.receivedAt || 0)) / 1000;
    const due = this.dirty || (t - (this.drawnAt ?? -1) >= ANIM_STEP && this.face.animated?.(this.view, this.ui));
    if (visible && due) {
      this.glowCtx.fillStyle = '#000';
      this.glowCtx.fillRect(0, 0, PX, PX);
      this.face.draw(this.ctx, this.view, this.ui);
      this.texture.needsUpdate = true;
      this.glowTexture.needsUpdate = true;
      this.dirty = false;
      this.drawnAt = t;
    }
    if (this.ledMat) {
      const strike = this.ui.strikeAt !== null && t - this.ui.strikeAt < 1.1;
      if (strike && (t - this.ui.strikeAt) % 0.3 < 0.18) this.setLed(0xff2010, 4);
      else if (this.ui.solved) this.setLed(0x30ff60, 3.2);
      else this.setLed(0x000000, 0);
    }
  }

  setLed(color, intensity) {
    this.ledMat.emissive.setHex(color);
    this.ledMat.emissiveIntensity = intensity;
    this.ledMat.color.setHex(intensity ? color : 0x1c1c1c);
  }

  regions() {
    return this.interactive ? this.face.regions(this.view) : [];
  }
}

export class BombView {
  constructor(container, { onAction }) {
    this.container = container;
    this.onAction = onAction;
    this.slots = [];
    this.byModule = new Map();
    this.focused = null;
    this.rot = { yaw: 0, pitch: 0.12 };
    this.rotT = { yaw: 0, pitch: 0.12 };
    this.dist = 5.7;
    this.shake = 0;
    this.ended = false;
    this.lastSecond = null;
    this.clock = new THREE.Clock();
    this._n = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._q = new THREE.Quaternion();

    // Sin antialias: el EffectComposer renderiza a un render target y lo descartaría igual.
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    this.dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    r.setPixelRatio(this.dpr);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false; // solo se recalculan cuando la bomba se mueve
    this.shadowPose = null;
    this.perf = { frames: 0, time: 0 };
    r.domElement.className = 'three';
    container.appendChild(r.domElement);

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x060705);
    scene.fog = new THREE.Fog(0x060705, 9, 24);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.32;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    this.camPos = new THREE.Vector3(0, 0.4, 9);
    this.camLook = new THREE.Vector3();

    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1208, 0.5));
    const key = new THREE.SpotLight(0xffd9a0, 95, 30, 0.55, 0.55, 1.5);
    key.position.set(-3.6, 6.5, 5.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    key.shadow.intensity = 0.6; // sombras más suaves
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fb0ff, 0.45);
    fill.position.set(5, 1.5, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffb070, 0.55);
    rim.position.set(2, 3, -6);
    scene.add(rim);

    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.75, metalness: 0.05 }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -CASE.h / 2 - 0.95;
    table.receiveShadow = true;
    scene.add(table);

    this.bomb = new THREE.Group();
    scene.add(this.bomb);
    this.buildCase();

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.4, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.raycaster = new THREE.Raycaster();
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  buildCase() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x2c3130, metalness: 0.75, roughness: 0.38 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(CASE.w, CASE.h, CASE.d, 4, 0.07), metal);
    body.castShadow = true;
    body.receiveShadow = true;
    this.bomb.add(body);
    const inset = new THREE.MeshStandardMaterial({ color: 0x121413, metalness: 0.5, roughness: 0.7 });
    for (const z of [1, -1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(CASE.w - 0.16, CASE.h - 0.16, 0.01), inset);
      plate.position.z = z * (CASE.d / 2 + 0.002);
      this.bomb.add(plate);
    }
    // esquineros de goma
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0e0e0d, roughness: 0.95, metalness: 0 });
    const corner = new RoundedBoxGeometry(0.3, 0.3, 0.3, 3, 0.06);
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const m = new THREE.Mesh(corner, rubber);
      m.position.set(x * CASE.w / 2, y * CASE.h / 2, z * CASE.d / 2);
      m.castShadow = true;
      this.bomb.add(m);
    }
  }

  build(state) {
    this.built = true;
    this.state = state;
    for (let s = 0; s < 12; s++) {
      const m = state.modules.find((x) => x.slot === s);
      const face = s === TIMER_SLOT ? timerFace : m ? FACES[m.type] : blankFace;
      const slot = new Slot(this, s, face, m || null);
      this.slots.push(slot);
      this.bomb.add(slot.group);
      if (m) this.byModule.set(m.id, slot);
      if (s === TIMER_SLOT) this.timerSlot = slot;
      if (!m && s !== TIMER_SLOT) slot.setView({}, true);
    }
    this.bomb.add(buildWidgets(state.edgework, CASE));
    this.shadowPose = null;
  }

  setState(state) {
    if (!this.built) this.build(state);
    this.state = state;
    this.timerBase = { remaining: state.remaining, rate: state.rate, at: performance.now() };
    for (const m of state.modules) {
      const slot = this.byModule.get(m.id);
      if (!slot) continue;
      if (m.needy && m.view.active && !slot.view?.active) audio.needyOn();
      slot.setView(m.view, m.solved);
    }
    this.timerSlot.dirty = true;
  }

  remaining() {
    if (!this.timerBase) return 0;
    if (this.frozen !== undefined) return this.frozen;
    const { remaining, rate, at } = this.timerBase;
    return Math.max(0, remaining - (rate * (performance.now() - at)) / 1000);
  }

  timerString() {
    return formatTimer(this.remaining());
  }

  fx(fx) {
    const slot = this.byModule.get(fx.moduleId);
    const t = this.clock.elapsedTime;
    if (fx.type === 'strike') {
      if (slot) slot.ui.strikeAt = t;
      if (slot) slot.dirty = true;
      audio.strike();
      this.shake = Math.max(this.shake, 0.35);
    } else if (fx.type === 'solve') {
      audio.solve();
    }
  }

  end(result) {
    this.ended = true;
    this.frozen = result.defused ? this.remaining() : 0;
    this.timerSlot.dirty = true;
    this.unfocus();
    if (result.defused) {
      audio.defused();
    } else {
      audio.explode();
      this.shake = 2.2;
    }
  }

  // ---------- Cámara ----------
  focus(slot) {
    if (!slot?.module) return;
    this.focused = slot;
    const back = slot.slot >= 6;
    const base = back ? Math.PI : 0;
    this.rotT.yaw = base + TWO_PI * Math.round((this.rot.yaw - base) / TWO_PI);
    this.rotT.pitch = 0;
    for (const s of this.slots) s.housingMat.emissive.setHex(0);
    audio.softClick();
    this.onFocusChange?.(true);
  }

  unfocus() {
    if (!this.focused) return;
    this.focused.ui.hover = null;
    this.focused.dirty = true;
    this.focused = null;
    this.rotT.pitch = 0.12;
    this.onFocusChange?.(false);
  }

  flip() {
    this.unfocus();
    this.rotT.yaw += Math.PI;
  }

  focusDistance() {
    const aspect = this.camera.aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return Math.max(2.05, 1.2 / (2 * tan), 1.2 / (2 * tan * aspect));
  }

  farDistance() {
    const aspect = this.camera.aspect;
    return this.dist * Math.max(1, 1.5 / aspect);
  }

  updateCamera(dt, t) {
    const k = 1 - Math.exp(-dt * 7);
    this.rot.yaw += (this.rotT.yaw - this.rot.yaw) * k;
    this.rot.pitch += (this.rotT.pitch - this.rot.pitch) * k;
    this.bomb.rotation.set(this.rot.pitch, this.rot.yaw, 0);
    this.bomb.position.y = this.focused ? 0 : Math.sin(t * 0.7) * 0.025;

    const look = new THREE.Vector3();
    const pos = new THREE.Vector3();
    if (this.focused) {
      const L = slotLocal(this.focused.slot);
      look.set(L.x, L.y, L.z).applyEuler(new THREE.Euler(this.rotT.pitch, this.rotT.yaw, 0));
      pos.copy(look).add(new THREE.Vector3(0, 0, this.focusDistance()));
    } else {
      pos.set(0, 0.45, this.farDistance());
    }
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      const s = Math.min(this.shake, 1) * 0.06;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt);
    }
    this.camera.lookAt(this.camLook);
  }

  // ---------- Entrada ----------
  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects([this.bomb], true);
    const hit = hits[0];
    if (!hit || !hit.object.userData.slot) return { slot: null };
    const slot = hit.object.userData.slot;
    return { slot, x: hit.uv.x * PX, y: (1 - hit.uv.y) * PX };
  }

  bindInput() {
    const el = this.renderer.domElement;
    let down = null;

    const onDown = (e) => {
      audio.unlock();
      if (this.ended || (e.button !== 0 && e.pointerType === 'mouse')) return;
      el.setPointerCapture(e.pointerId);
      const p = this.pick(e);
      down = { x: e.clientX, y: e.clientY, p, moved: false, press: null };
      if (p.slot && p.slot === this.focused && p.slot.interactive) {
        const region = hitTest(p.slot.regions(), p.x, p.y);
        if (region !== null) {
          const action = p.slot.face.press(region, p.slot.view, p.slot.ui);
          p.slot.ui.pressed = region;
          p.slot.dirty = true;
          down.press = { slot: p.slot, region };
          if (action) this.onAction(p.slot.module.id, action);
        }
      }
    };

    const onMove = (e) => {
      if (down && !down.press) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.moved && Math.hypot(dx, dy) > 6) {
          down.moved = true;
          this.unfocus();
        }
        if (down.moved) {
          const last = down.last || down;
          this.rotT.yaw += (e.clientX - last.x) * 0.006;
          this.rotT.pitch = THREE.MathUtils.clamp(this.rotT.pitch + (e.clientY - last.y) * 0.005, -1.35, 1.35);
          down.last = { x: e.clientX, y: e.clientY };
        }
        return;
      }
      if (down) return;
      this.hover(e);
    };

    const onUp = (e) => {
      if (!down) return;
      const d = down;
      down = null;
      if (d.press) {
        const { slot, region } = d.press;
        slot.ui.pressed = null;
        slot.dirty = true;
        const action = slot.face.release?.(region, slot.view, slot.ui);
        if (action) this.onAction(slot.module.id, action);
        return;
      }
      if (d.moved) return;
      const s = d.p.slot;
      if (s?.module && s !== this.focused) this.focus(s);
      else if (!s && this.focused) this.unfocus();
      this.hover(e);
    };

    const onKey = (e) => {
      if (this.ended || e.target.closest?.('input, textarea')) return;
      if (e.key === 'Escape') this.unfocus();
      else if (e.key === ' ') { e.preventDefault(); this.flip(); }
      else if (this.focused?.face.key && this.focused.interactive) {
        const dir = this.focused.face.key(e.key);
        if (dir) {
          e.preventDefault();
          const action = this.focused.face.press(dir, this.focused.view, this.focused.ui);
          if (action) this.onAction(this.focused.module.id, action);
        }
      }
    };

    const onWheel = (e) => {
      if (this.focused) return;
      e.preventDefault();
      this.dist = THREE.MathUtils.clamp(this.dist + e.deltaY * 0.004, 3.2, 9);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', () => this.clearHover());
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.unfocus(); });
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    this.unbind = () => window.removeEventListener('keydown', onKey);
  }

  clearHover() {
    for (const s of this.slots) {
      if (s.ui.hover !== null) { s.ui.hover = null; s.dirty = true; }
      s.housingMat.emissive.setHex(0);
    }
    this.renderer.domElement.style.cursor = '';
  }

  hover(e) {
    const p = this.pick(e);
    let cursor = 'grab';
    for (const s of this.slots) s.housingMat.emissive.setHex(0);
    if (this.focused) {
      const region = p.slot === this.focused ? hitTest(this.focused.regions(), p.x, p.y) : null;
      if (region !== this.focused.ui.hover) {
        this.focused.ui.hover = region;
        this.focused.dirty = true;
      }
      if (region !== null) cursor = 'pointer';
      else if (p.slot?.module && p.slot !== this.focused) cursor = 'zoom-in';
    } else if (p.slot?.module) {
      p.slot.housingMat.emissive.setHex(0x3a2c00);
      cursor = 'zoom-in';
    }
    this.renderer.domElement.style.cursor = cursor;
  }

  // ---------- Bucle ----------
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Recalcula sombras solo si la bomba giró o se desplazó de forma apreciable.
  updateShadows() {
    const pose = [this.rot.pitch, this.rot.yaw, this.bomb.position.y];
    const last = this.shadowPose;
    if (!last || Math.abs(pose[0] - last[0]) > 1e-3 || Math.abs(pose[1] - last[1]) > 1e-3 || Math.abs(pose[2] - last[2]) > 0.005) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowPose = pose;
    }
  }

  // Si el equipo no alcanza ~40 fps, baja la resolución de render (nunca la sube).
  adaptQuality(rawDt) {
    if (rawDt > 0.5) { this.perf.frames = this.perf.time = 0; return; } // pestaña oculta o pausa
    this.perf.frames++;
    this.perf.time += rawDt;
    if (this.perf.time < 2) return;
    const fps = this.perf.frames / this.perf.time;
    this.perf.frames = this.perf.time = 0;
    if (fps < 40 && this.dpr > MIN_DPR) {
      this.dpr = Math.max(MIN_DPR, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.composer.setPixelRatio(this.dpr);
      this.resize();
    }
  }

  slotVisible(slot) {
    const n = this._n.set(0, 0, 1).applyQuaternion(slot.group.getWorldQuaternion(this._q));
    const p = slot.group.getWorldPosition(this._p);
    p.sub(this.camera.position);
    return n.dot(p) < 0.1 * p.length(); // margen para caras vistas casi de canto
  }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const t = this.clock.elapsedTime;
    this.adaptQuality(rawDt);
    this.updateCamera(dt, t);
    this.bomb.updateMatrixWorld();
    if (this.built) {
      const rem = this.remaining();
      const display = formatTimer(rem);
      if (display !== this.lastDisplay || this.state.strikes !== this.lastStrikes) {
        this.lastDisplay = display;
        this.lastStrikes = this.state.strikes;
        this.timerSlot.setView({ display, strikes: this.state.strikes, strikesMax: this.state.mission.strikes }, false);
      }
      const sec = Math.ceil(rem);
      if (!this.ended && sec !== this.lastSecond) {
        if (this.lastSecond !== null) audio.tick(rem < 60);
        this.lastSecond = sec;
      }
      for (const s of this.slots) {
        if (s.module?.needy && s.view?.active && !this.ended) {
          const left = Math.ceil(s.view.timeLeft + s.view.rate * s.ui.age);
          if (left !== s.lastLeft && left <= 10 && s.view.rate < 0) audio.needyAlarm();
          s.lastLeft = left;
        }
        s.render(t, this.slotVisible(s));
      }
    }
    this.updateShadows();
    this.composer.render();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.unbind?.();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const k of ['map', 'emissiveMap']) m[k]?.dispose();
        m.dispose();
      }
    });
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

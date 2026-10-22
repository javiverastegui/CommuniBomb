import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../shared/rng.js';
import { generateEdgework } from '../shared/edgework.js';
import { MODULES } from '../shared/modules/index.js';
import { wireToCut } from '../shared/modules/wires.js';
import { shouldHold } from '../shared/modules/button.js';
import { memoryAnswer } from '../shared/modules/memory.js';
import { SIMON_MAP } from '../shared/modules/simon.js';
import { MAZES } from '../shared/modules/maze.js';
import { KEYPAD_COLUMNS } from '../shared/modules/keypad.js';
import { WHO_LISTS, WHO_GROUPS, WHO_DISPLAY, WHO_DISPLAY_POS } from '../shared/modules/who.js';
import { generateBomb } from '../shared/bomb.js';
import { resolveMission, sanitizeSettings } from '../shared/missions.js';
import { Game } from '../shared/game.js';

const E = (o = {}) => ({ serial: 'AB1CD2', batteries: [], indicators: [], plates: [], ...o });
const ctx = (e, rng, extra = {}) => ({ now: 0, edgework: e, strikes: 0, rng, timerString: (s) => s, ...extra });

test('cables: reglas conocidas', () => {
  const odd = E({ serial: 'AB1CD3' });
  assert.equal(wireToCut(['blue', 'blue', 'white'], E()), 1);
  assert.equal(wireToCut(['red', 'blue', 'white'], E()), 2);
  assert.equal(wireToCut(['blue', 'white', 'black'], E()), 1);
  assert.equal(wireToCut(['red', 'blue', 'blue'], E()), 2);
  assert.equal(wireToCut(['red', 'red', 'blue', 'black'], odd), 1);
  assert.equal(wireToCut(['blue', 'white', 'white', 'yellow'], E()), 0);
  assert.equal(wireToCut(['red', 'white', 'white', 'yellow', 'black'], odd), 3);
  assert.equal(wireToCut(['red', 'white', 'white', 'blue', 'blue', 'blue'], odd), 2);
});

test('botón: reglas de mantener/soltar', () => {
  assert.equal(shouldHold({ color: 'blue', label: 'ABORTAR' }, E()), true);
  assert.equal(shouldHold({ color: 'red', label: 'DETONAR' }, E({ batteries: [{ type: 'AA', count: 2 }] })), false);
  assert.equal(shouldHold({ color: 'red', label: 'MANTENER' }, E()), false);
  assert.equal(shouldHold({ color: 'white', label: 'PRESIONAR' }, E()), true);
});

test('memoria: etapa 1', () => {
  assert.equal(memoryAnswer(0, 1, [1, 2, 3, 4], []), 1);
  assert.equal(memoryAnswer(0, 4, [1, 2, 3, 4], []), 3);
  assert.equal(memoryAnswer(1, 1, [3, 4, 1, 2], [{ pos: 1, label: 2 }]), 1);
});

test('teclado: siempre hay una única columna posible', () => {
  const rng = createRng(1);
  for (let i = 0; i < 500; i++) {
    const st = MODULES.keypad.create(rng);
    const cols = KEYPAD_COLUMNS.filter((c) => st.symbols.every((s) => c.includes(s)));
    assert.equal(cols.length, 1);
  }
});

test('quién va primero: cada lista contiene su propia palabra', () => {
  for (const g of WHO_GROUPS) for (const w of g) assert.ok(WHO_LISTS[w].includes(w));
  for (const d of WHO_DISPLAY) assert.ok(WHO_DISPLAY_POS[d] >= 0 && WHO_DISPLAY_POS[d] <= 5);
});

test('laberintos: todas las celdas conectadas y círculos únicos', () => {
  const all = MAZES.flatMap((m) => m.circles);
  assert.equal(new Set(all).size, 18);
  for (const m of MAZES) assert.ok(m.open.every((o) => o > 0));
});

// Resuelve cada módulo usando su secreto, para comprobar que siempre es resoluble.
function solveModule(type, st, e, rng) {
  const def = MODULES[type];
  const c = ctx(e, rng);
  const sec = st.secret;
  switch (type) {
    case 'wires': return def.handle(st, { type: 'cut', slot: sec.answer }, c);
    case 'button': {
      def.handle(st, { type: 'press' }, c);
      if (!shouldHold(st, e)) return def.handle(st, { type: 'release', heldMs: 100 }, c);
      const digit = { blue: 4, white: 1, yellow: 5, red: 1 }[st.strip];
      return def.handle(st, { type: 'release', heldMs: 2000, timer: `0${digit}:00` }, c);
    }
    case 'keypad': {
      let r;
      for (const i of [...sec.order]) r = def.handle(st, { type: 'press', index: i }, c);
      return r;
    }
    case 'simon': {
      const table = SIMON_MAP[/[AEIOU]/.test(e.serial) ? 'vowel' : 'noVowel'][0];
      let r = null;
      while (r !== 'solve') {
        for (const col of sec.sequence.slice(0, st.stage + 1)) {
          r = def.handle(st, { type: 'press', color: table[col] }, c);
          assert.notEqual(r, 'strike');
        }
      }
      return r;
    }
    case 'who': {
      let r;
      for (let i = 0; i < 3; i++) r = def.handle(st, { type: 'press', index: sec.answer }, c);
      return r;
    }
    case 'memory': {
      let r;
      for (let i = 0; i < 5; i++) r = def.handle(st, { type: 'press', index: memoryAnswer(st.stage, st.display, st.labels, sec.history) }, c);
      return r;
    }
    case 'morse': {
      while (st.freq < sec.answer) def.handle(st, { type: 'right' }, c);
      return def.handle(st, { type: 'tx' }, c);
    }
    case 'complicated': {
      let r;
      sec.must.forEach((m, i) => { if (m) r = def.handle(st, { type: 'cut', slot: i }, c); });
      return r;
    }
    case 'sequence': {
      let r;
      for (let p = 0; p < 4; p++) {
        sec.must[p].forEach((m, i) => { if (m) assert.notEqual(def.handle(st, { type: 'cut', index: i }, c), 'strike'); });
        r = def.handle(st, { type: 'next' }, c);
      }
      return r;
    }
    case 'maze': {
      const { open } = MAZES[sec.maze];
      const prev = new Map([[st.pos, null]]);
      const q = [st.pos];
      const dirs = [['N', 0, -1, 1], ['E', 1, 0, 2], ['S', 0, 1, 4], ['W', -1, 0, 8]];
      while (q.length) {
        const cell = q.shift();
        for (const [d, dx, dy, bit] of dirs) {
          const n = cell + dy * 6 + dx;
          if (open[cell] & bit && !prev.has(n)) { prev.set(n, [cell, d]); q.push(n); }
        }
      }
      const path = [];
      for (let cell = st.goal; prev.get(cell); cell = prev.get(cell)[0]) path.unshift(prev.get(cell)[1]);
      let r;
      for (const d of path) r = def.handle(st, { type: 'move', dir: d }, c);
      return r;
    }
    case 'password': {
      st.idx = st.cols.map((col, i) => col.indexOf(sec.word[i]));
      return def.handle(st, { type: 'submit' }, c);
    }
  }
}

test('todos los módulos regulares son resolubles', () => {
  const rng = createRng(42);
  for (let i = 0; i < 300; i++) {
    const e = generateEdgework(rng);
    for (const type of Object.keys(MODULES).filter((t) => !MODULES[t].needy)) {
      const st = MODULES[type].create(rng, e);
      assert.equal(solveModule(type, st, e, rng), 'solve', `${type} no se resolvió`);
    }
  }
});

test('perilla: strike si la posición es incorrecta', async () => {
  const rng = createRng(7);
  const st = MODULES.knob.create(rng);
  st.secret.cooldown = 0;
  MODULES.knob.tick(st, 0.1, ctx(E(), rng));
  assert.equal(st.active, true);
  const want = ['up', 'right', 'down', 'left'];
  const { dir } = (await import('../shared/modules/knob.js')).KNOB_PATTERNS[st.secret.pattern];
  st.pos = (want.indexOf(dir) + 1) % 4;
  const { result } = MODULES.knob.tick(st, 100, ctx(E(), rng));
  assert.equal(result, 'strike');
});

test('generación de bombas para todas las dificultades', () => {
  for (const difficulty of ['training', 'normal', 'hard', 'expert', 'custom']) {
    const mission = resolveMission(sanitizeSettings({ difficulty }));
    const bomb = generateBomb(mission, 123);
    const slots = bomb.modules.map((m) => m.slot);
    assert.equal(new Set(slots).size, slots.length);
    assert.ok(!slots.includes(1));
    assert.equal(bomb.modules.length, mission.modules + mission.needy);
  }
});

test('partida: tres strikes hacen explotar la bomba', () => {
  const mission = resolveMission(sanitizeSettings({ difficulty: 'training' }));
  let ended = null;
  const g = new Game(mission, { onState() {}, onFx() {}, onEnd: (r) => (ended = r) }, 99);
  g.startedAt = Date.now();
  const m = g.bomb.modules[0];
  for (let i = 0; i < 3; i++) g.strike(m);
  assert.equal(ended.defused, false);
  assert.equal(ended.cause, 'strikes');
});

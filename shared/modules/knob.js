import { needyState, needyTick, needyDeactivate } from './needy.js';

// 12 LEDs: fila superior (6) y fila inferior (6). 1 = encendido.
export const KNOB_DIRS = ['up', 'right', 'down', 'left'];
export const KNOB_DIR_NAMES = { up: 'ARRIBA', right: 'DERECHA', down: 'ABAJO', left: 'IZQUIERDA' };
export const KNOB_PATTERNS = [
  { dir: 'up', top: '101100', bottom: '011011' },
  { dir: 'up', top: '110010', bottom: '101101' },
  { dir: 'down', top: '011001', bottom: '111100' },
  { dir: 'down', top: '100101', bottom: '001110' },
  { dir: 'left', top: '000110', bottom: '110010' },
  { dir: 'left', top: '010000', bottom: '111001' },
  { dir: 'right', top: '111011', bottom: '000101' },
  { dir: 'right', top: '001111', bottom: '100100' },
];

export default {
  type: 'knob',
  name: 'Perilla',
  needy: true,
  create(rng) {
    return needyState(rng, { pos: rng.int(0, 3), leds: null, secret: { cooldown: rng.int(25, 50), pattern: 0 } });
  },
  handle(st, action) {
    if (action.type === 'turn') st.pos = (st.pos + 1) % 4;
    return null;
  },
  tick(st, dt, ctx) {
    return needyTick(st, dt, ctx, {
      duration: 35,
      onActivate(s, c) {
        s.secret.pattern = c.rng.int(0, KNOB_PATTERNS.length - 1);
        const p = KNOB_PATTERNS[s.secret.pattern];
        s.leds = p.top + p.bottom;
      },
      onExpire(s, c) {
        const ok = KNOB_DIRS[s.pos] === KNOB_PATTERNS[s.secret.pattern].dir;
        s.leds = null;
        needyDeactivate(s, c.rng);
        return ok ? null : 'strike';
      },
    });
  },
};

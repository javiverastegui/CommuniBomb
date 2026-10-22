import { edge } from '../edgework.js';

export const COMPLICATED_COLORS = ['white', 'red', 'blue', 'redwhite', 'bluewhite', 'redblue'];

// Clave: R (tiene rojo), B (tiene azul), S (estrella), L (LED encendido).
// C = cortar, D = no cortar, S = cortar si el último dígito del serial es par,
// P = cortar si hay puerto paralelo, B = cortar si hay dos o más baterías.
export const COMPLICATED_RULES = {
  '': 'C', R: 'S', B: 'S', S: 'C', L: 'D',
  RB: 'S', RS: 'C', RL: 'B', BS: 'D', BL: 'P', SL: 'B',
  RBS: 'P', RBL: 'S', RSL: 'B', BSL: 'P', RBSL: 'D',
};

export function complicatedKey(w) {
  return (w.color.includes('red') ? 'R' : '') + (w.color.includes('blue') ? 'B' : '') +
    (w.star ? 'S' : '') + (w.led ? 'L' : '');
}

export function shouldCutComplicated(w, e) {
  switch (COMPLICATED_RULES[complicatedKey(w)]) {
    case 'C': return true;
    case 'S': return edge.lastDigitEven(e);
    case 'P': return edge.hasPort(e, 'parallel');
    case 'B': return edge.batteries(e) >= 2;
    default: return false;
  }
}

export default {
  type: 'complicated',
  name: 'Cables complicados',
  create(rng, e) {
    for (;;) {
      const slots = rng.sample([0, 1, 2, 3, 4, 5], rng.int(3, 6));
      const wires = Array(6).fill(null);
      for (const s of slots) wires[s] = { color: rng.pick(COMPLICATED_COLORS), star: rng.chance(0.4), led: rng.chance(0.4) };
      const must = wires.map((w) => !!w && shouldCutComplicated(w, e));
      if (must.some(Boolean)) return { wires, cut: Array(6).fill(false), secret: { must } };
    }
  },
  handle(st, action) {
    if (action.type !== 'cut') return null;
    const s = action.slot;
    if (!st.wires[s] || st.cut[s]) return null;
    st.cut[s] = true;
    if (!st.secret.must[s]) return 'strike';
    return st.secret.must.every((m, i) => !m || st.cut[i]) ? 'solve' : null;
  },
};

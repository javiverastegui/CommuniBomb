import { edge } from '../edgework.js';

export const WIRE_COLORS = ['red', 'white', 'blue', 'yellow', 'black'];

// Devuelve el índice (entre los cables presentes) del cable que hay que cortar.
export function wireToCut(colors, e) {
  const n = colors.length;
  const count = (c) => colors.filter((x) => x === c).length;
  const lastOf = (c) => colors.lastIndexOf(c);
  const last = colors[n - 1];
  const odd = edge.lastDigitOdd(e);

  if (n === 3) {
    if (!count('red')) return 1;
    if (last === 'white') return n - 1;
    if (count('blue') > 1) return lastOf('blue');
    return n - 1;
  }
  if (n === 4) {
    if (count('red') > 1 && odd) return lastOf('red');
    if (last === 'yellow' && !count('red')) return 0;
    if (count('blue') === 1) return 0;
    if (count('yellow') > 1) return n - 1;
    return 1;
  }
  if (n === 5) {
    if (last === 'black' && odd) return 3;
    if (count('red') === 1 && count('yellow') > 1) return 0;
    if (!count('black')) return 1;
    return 0;
  }
  if (!count('yellow') && odd) return 2;
  if (count('yellow') === 1 && count('white') > 1) return 3;
  if (!count('red')) return 5;
  return 3;
}

export default {
  type: 'wires',
  name: 'Cables',
  create(rng, e) {
    const n = rng.int(3, 6);
    const slots = rng.sample([0, 1, 2, 3, 4, 5], n).sort((a, b) => a - b);
    const colors = slots.map(() => rng.pick(WIRE_COLORS));
    const wires = Array(6).fill(null);
    slots.forEach((s, i) => (wires[s] = colors[i]));
    return { wires, cut: Array(6).fill(false), secret: { answer: slots[wireToCut(colors, e)] } };
  },
  handle(st, action) {
    if (action.type !== 'cut') return null;
    const s = action.slot;
    if (!st.wires[s] || st.cut[s]) return null;
    st.cut[s] = true;
    return s === st.secret.answer ? 'solve' : 'strike';
  },
};

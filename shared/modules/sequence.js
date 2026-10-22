// Tabla de ocurrencias: para la n-ésima aparición de un color, a qué letras se puede cortar.
export const SEQUENCE_TABLE = {
  red: ['C', 'B', 'A', 'AC', 'B', 'AC', 'ABC', 'AB', 'B'],
  blue: ['B', 'AC', 'B', 'A', 'B', 'BC', 'C', 'AC', 'A'],
  black: ['ABC', 'AC', 'B', 'AC', 'B', 'BC', 'AB', 'C', 'C'],
};
const COLORS = ['red', 'blue', 'black'];
const PANELS = 4;

export default {
  type: 'sequence',
  name: 'Secuencia de cables',
  create(rng) {
    const counts = { red: 0, blue: 0, black: 0 };
    const panels = [];
    const must = [];
    for (let p = 0; p < PANELS; p++) {
      const froms = rng.sample([0, 1, 2], rng.int(1, 3)).sort();
      const wires = [];
      const mustP = [];
      for (const from of froms) {
        const color = rng.pick(COLORS.filter((c) => counts[c] < 9));
        const to = rng.int(0, 2);
        const occ = ++counts[color];
        wires.push({ from, to, color, cut: false });
        mustP.push(SEQUENCE_TABLE[color][occ - 1].includes('ABC'[to]));
      }
      panels.push(wires);
      must.push(mustP);
    }
    return { panel: 0, wires: panels[0], secret: { panels, must } };
  },
  handle(st, action) {
    const sec = st.secret;
    if (action.type === 'cut') {
      const w = sec.panels[st.panel][action.index];
      if (!w || w.cut) return null;
      w.cut = true;
      return sec.must[st.panel][action.index] ? null : 'strike';
    }
    if (action.type === 'next') {
      const pending = sec.must[st.panel].some((m, i) => m && !sec.panels[st.panel][i].cut);
      if (pending) return 'strike';
      st.panel++;
      if (st.panel >= PANELS) {
        st.panel = PANELS - 1;
        return 'solve';
      }
      st.wires = sec.panels[st.panel];
    }
    return null;
  },
};

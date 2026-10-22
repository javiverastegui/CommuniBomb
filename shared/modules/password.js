export const PASSWORDS = [
  'ABRIR', 'ACERO', 'AGUAS', 'ALTAR', 'ARBOL', 'BARCO', 'BOTAS', 'CABLE', 'CAMPO', 'CARTA',
  'CIELO', 'DEDOS', 'DULCE', 'FUEGO', 'GATOS', 'HIELO', 'JUEGO', 'LIBRO', 'LLAVE', 'MANOS',
  'MARCO', 'MENTE', 'MUNDO', 'NOCHE', 'NUEVO', 'PERRO', 'PIANO', 'PLATO', 'PUNTO', 'RADIO',
  'RELOJ', 'SALTO', 'TARDE', 'TIGRE', 'VERDE',
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default {
  type: 'password',
  name: 'Contraseña',
  create(rng) {
    for (;;) {
      const word = rng.pick(PASSWORDS);
      const cols = [...word].map((ch) =>
        rng.shuffle([ch, ...rng.sample([...ALPHABET].filter((c) => c !== ch), 5)]));
      const matches = PASSWORDS.filter((w) => [...w].every((ch, i) => cols[i].includes(ch)));
      if (matches.length !== 1) continue;
      return { cols, idx: cols.map(() => rng.int(0, 5)), secret: { word } };
    }
  },
  handle(st, action) {
    const c = action.col;
    if (action.type === 'up' && st.idx[c] !== undefined) st.idx[c] = (st.idx[c] + 5) % 6;
    else if (action.type === 'down' && st.idx[c] !== undefined) st.idx[c] = (st.idx[c] + 1) % 6;
    else if (action.type === 'submit') {
      const guess = st.cols.map((col, i) => col[st.idx[i]]).join('');
      return guess === st.secret.word ? 'solve' : 'strike';
    }
    return null;
  },
};

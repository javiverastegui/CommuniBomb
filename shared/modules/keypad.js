// Seis columnas de símbolos. Los cuatro símbolos de un módulo pertenecen a una sola columna.
export const KEYPAD_COLUMNS = [
  ['Ø', 'Δ', 'λ', 'ζ', 'Ф', 'Ћ', 'Э'],
  ['Ё', 'Ø', 'Э', 'ξ', '☆', 'Ћ', '¿'],
  ['©', 'ω', 'ξ', 'Ж', 'Я', 'λ', '☆'],
  ['б', '¶', 'Ђ', 'Ф', 'Ж', '¿', '☺'],
  ['Ψ', '☺', 'Ђ', 'Є', '¶', '§', '★'],
  ['б', 'Ё', '‡', 'æ', 'Ψ', 'Й', 'Ω'],
];

export default {
  type: 'keypad',
  name: 'Teclado',
  create(rng) {
    for (;;) {
      const ci = rng.int(0, 5);
      const col = KEYPAD_COLUMNS[ci];
      const chosen = rng.sample(col, 4);
      const ambiguous = KEYPAD_COLUMNS.some((c, i) => i !== ci && chosen.every((s) => c.includes(s)));
      if (ambiguous) continue;
      const symbols = rng.shuffle(chosen);
      const order = chosen
        .slice()
        .sort((a, b) => col.indexOf(a) - col.indexOf(b))
        .map((s) => symbols.indexOf(s));
      return { symbols, pressed: [false, false, false, false], secret: { order, step: 0 } };
    }
  },
  handle(st, action) {
    if (action.type !== 'press') return null;
    const i = action.index;
    if (!(i >= 0 && i < 4) || st.pressed[i]) return null;
    if (st.secret.order[st.secret.step] !== i) return 'strike';
    st.pressed[i] = true;
    st.secret.step++;
    return st.secret.step === 4 ? 'solve' : null;
  },
};

export const MORSE_CODE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
};

export const MORSE_WORDS = [
  ['CASA', '3.505'], ['CASO', '3.515'], ['CAOS', '3.522'], ['COSA', '3.532'],
  ['BOMBA', '3.535'], ['BOTE', '3.542'], ['BROMA', '3.545'], ['BRISA', '3.552'],
  ['TRAMA', '3.555'], ['TRIGO', '3.565'], ['SALTO', '3.572'], ['SALSA', '3.575'],
  ['VECTOR', '3.582'], ['VELA', '3.592'], ['FLECHA', '3.595'], ['FUEGO', '3.600'],
];

export default {
  type: 'morse',
  name: 'Código Morse',
  create(rng) {
    const answer = rng.int(0, MORSE_WORDS.length - 1);
    const word = MORSE_WORDS[answer][0];
    return {
      freq: 0,
      signal: [...word].map((ch) => MORSE_CODE[ch]),
      secret: { answer },
    };
  },
  handle(st, action) {
    if (action.type === 'left') st.freq = Math.max(0, st.freq - 1);
    else if (action.type === 'right') st.freq = Math.min(MORSE_WORDS.length - 1, st.freq + 1);
    else if (action.type === 'tx') return st.freq === st.secret.answer ? 'solve' : 'strike';
    return null;
  },
};

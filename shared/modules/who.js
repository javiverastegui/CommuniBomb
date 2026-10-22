import { createRng } from '../rng.js';

// Palabras de la pantalla (la cadena vacía es una pantalla en blanco).
export const WHO_DISPLAY = [
  '', 'SÍ', 'SI', 'SE', 'SÉ', 'HAY', 'AY', 'AHÍ', 'VAYA', 'VALLA', 'BAYA', 'HOLA', 'OLA', 'TU',
  'TÚ', 'EL', 'ÉL', 'NADA', 'VACÍO', 'ESPACIO', 'ESPERA', 'ARRIBA', 'LETRAS', 'UNA LETRA', 'TE', 'TÉ', 'C', 'CE',
];

// Etiquetas de los botones: los seis botones de un módulo salen siempre del mismo grupo.
export const WHO_GROUPS = [
  ['LISTO', 'PRIMERO', 'NO', 'EN BLANCO', 'NADA', 'SÍ', 'QUÉ', 'EHHH', 'IZQUIERDA', 'DERECHA', 'MEDIO', 'OK', 'ESPERA', 'PRESIONA'],
  ['TÚ', 'TU', 'TUS', 'TÚ ERES', 'TUYO', 'T', 'AJÁ', 'AH AH', '¿QUÉ?', 'HECHO', 'SIGUIENTE', 'MANTÉN', 'CLARO', 'COMO'],
];

// Posiciones: 0 sup-izq, 1 sup-der, 2 medio-izq, 3 medio-der, 4 inf-izq, 5 inf-der.
// Las tablas se generan con una semilla fija: el manual y el servidor usan exactamente los mismos datos.
const r = createRng(0x51a7e);
export const WHO_DISPLAY_POS = Object.fromEntries(WHO_DISPLAY.map((w) => [w, r.int(0, 5)]));
export const WHO_LISTS = {};
for (const group of WHO_GROUPS) for (const w of group) WHO_LISTS[w] = r.shuffle(group);

export function whoAnswer(display, labels) {
  const ref = labels[WHO_DISPLAY_POS[display]];
  const word = WHO_LISTS[ref].find((w) => labels.includes(w));
  return labels.indexOf(word);
}

function newStage(st, rng) {
  st.display = rng.pick(WHO_DISPLAY);
  st.labels = rng.sample(rng.pick(WHO_GROUPS), 6);
  st.secret.answer = whoAnswer(st.display, st.labels);
}

export default {
  type: 'who',
  name: '¿Quién va primero?',
  create(rng) {
    const st = { stage: 0, display: '', labels: [], secret: {} };
    newStage(st, rng);
    return st;
  },
  handle(st, action, ctx) {
    if (action.type !== 'press') return null;
    if (action.index !== st.secret.answer) {
      newStage(st, ctx.rng);
      return 'strike';
    }
    st.stage++;
    if (st.stage >= 3) return 'solve';
    newStage(st, ctx.rng);
    return null;
  },
};

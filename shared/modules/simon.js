import { edge } from '../edgework.js';

export const SIMON_COLORS = ['red', 'blue', 'green', 'yellow'];

// SIMON_MAP[vocal ? 'vowel' : 'noVowel'][strikes][colorQueParpadea] = botón a presionar
export const SIMON_MAP = {
  vowel: [
    { red: 'blue', blue: 'red', green: 'yellow', yellow: 'green' },
    { red: 'yellow', blue: 'green', green: 'blue', yellow: 'red' },
    { red: 'green', blue: 'red', green: 'yellow', yellow: 'blue' },
  ],
  noVowel: [
    { red: 'blue', blue: 'yellow', green: 'green', yellow: 'red' },
    { red: 'red', blue: 'blue', green: 'yellow', yellow: 'green' },
    { red: 'yellow', blue: 'green', green: 'blue', yellow: 'red' },
  ],
};

export default {
  type: 'simon',
  name: 'Simón dice',
  create(rng) {
    const sequence = Array.from({ length: rng.int(3, 5) }, () => rng.pick(SIMON_COLORS));
    return { stage: 0, flashes: sequence.slice(0, 1), secret: { sequence, input: 0 } };
  },
  handle(st, action, ctx) {
    if (action.type !== 'press' || !SIMON_COLORS.includes(action.color)) return null;
    const table = SIMON_MAP[edge.hasVowel(ctx.edgework) ? 'vowel' : 'noVowel'][Math.min(ctx.strikes, 2)];
    const sec = st.secret;
    if (action.color !== table[sec.sequence[sec.input]]) {
      sec.input = 0;
      return 'strike';
    }
    sec.input++;
    if (sec.input > st.stage) {
      st.stage++;
      sec.input = 0;
      if (st.stage >= sec.sequence.length) return 'solve';
      st.flashes = sec.sequence.slice(0, st.stage + 1);
    }
    return null;
  },
};

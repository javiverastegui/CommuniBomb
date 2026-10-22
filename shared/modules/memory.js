// Devuelve la posición (0-3) que hay que presionar en la etapa actual.
export function memoryAnswer(stage, display, labels, history) {
  const posOf = (label) => labels.indexOf(label);
  const d = display;
  switch (stage) {
    case 0: return [1, 1, 2, 3][d - 1];
    case 1: return d === 1 ? posOf(4) : d === 3 ? 0 : history[0].pos;
    case 2: return d === 1 ? posOf(history[1].label) : d === 2 ? posOf(history[0].label) : d === 3 ? 2 : posOf(4);
    case 3: return d === 1 ? history[0].pos : d === 2 ? 0 : history[1].pos;
    default: return posOf([history[0].label, history[1].label, history[3].label, history[2].label][d - 1]);
  }
}

function newStage(st, rng) {
  st.display = rng.int(1, 4);
  st.labels = rng.shuffle([1, 2, 3, 4]);
}

export default {
  type: 'memory',
  name: 'Memoria',
  create(rng) {
    const st = { stage: 0, display: 1, labels: [1, 2, 3, 4], secret: { history: [] } };
    newStage(st, rng);
    return st;
  },
  handle(st, action, ctx) {
    if (action.type !== 'press') return null;
    const { history } = st.secret;
    const answer = memoryAnswer(st.stage, st.display, st.labels, history);
    if (action.index !== answer) {
      st.stage = 0;
      st.secret.history = [];
      newStage(st, ctx.rng);
      return 'strike';
    }
    history.push({ pos: answer, label: st.labels[answer] });
    st.stage++;
    if (st.stage >= 5) return 'solve';
    newStage(st, ctx.rng);
    return null;
  },
};

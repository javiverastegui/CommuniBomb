import { needyState, needyTick } from './needy.js';

export const CAPACITOR_MAX = 45;
const DISCHARGE_RATE = 8;

export default {
  type: 'capacitor',
  name: 'Descarga de capacitor',
  needy: true,
  create(rng) {
    return needyState(rng, { holding: false });
  },
  handle(st, action) {
    if (action.type === 'hold') st.holding = true;
    else if (action.type === 'release') st.holding = false;
    else return null;
    if (st.active) st.rate = st.holding ? DISCHARGE_RATE : -1;
    return null;
  },
  tick(st, dt, ctx) {
    // Una vez activo, el capacitor no se apaga: hay que descargarlo una y otra vez.
    const res = needyTick(st, dt, ctx, {
      duration: CAPACITOR_MAX,
      onActivate(s) { s.rate = s.holding ? DISCHARGE_RATE : -1; },
      onExpire(s) { s.timeLeft = CAPACITOR_MAX; return 'strike'; },
    });
    if (st.timeLeft > CAPACITOR_MAX) st.timeLeft = CAPACITOR_MAX;
    return res;
  },
};

import { needyState, needyTick, needyDeactivate } from './needy.js';

export const VENT_QUESTIONS = { vent: '¿VENTILAR GAS?', detonate: '¿DETONAR?' };

export default {
  type: 'vent',
  name: 'Ventilar gas',
  needy: true,
  create(rng) {
    return needyState(rng, { question: null, message: null });
  },
  handle(st, action, ctx) {
    if (!st.active || (action.type !== 'yes' && action.type !== 'no')) return null;
    const yes = action.type === 'yes';
    if (st.question === 'vent') {
      if (yes) { needyDeactivate(st, ctx.rng); st.question = null; st.message = null; return null; }
      st.message = 'VENTILAR EVITA EXPLOSIONES';
      return null;
    }
    needyDeactivate(st, ctx.rng);
    st.question = null;
    st.message = null;
    return yes ? 'strike' : null;
  },
  tick(st, dt, ctx) {
    return needyTick(st, dt, ctx, {
      duration: 40,
      onActivate(s, c) {
        s.question = c.rng.chance(0.7) ? 'vent' : 'detonate';
        s.message = null;
      },
      onExpire(s, c) {
        s.question = null;
        s.message = null;
        needyDeactivate(s, c.rng);
        return 'strike';
      },
    });
  },
};

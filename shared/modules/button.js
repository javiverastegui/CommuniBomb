import { edge } from '../edgework.js';

export const BUTTON_COLORS = ['blue', 'white', 'yellow', 'red'];
export const BUTTON_LABELS = ['ABORTAR', 'DETONAR', 'MANTENER', 'PRESIONAR'];
export const STRIP_DIGIT = { blue: 4, white: 1, yellow: 5, red: 1 };
export const HOLD_THRESHOLD_MS = 500;

export function shouldHold({ color, label }, e) {
  if (color === 'blue' && label === 'ABORTAR') return true;
  if (edge.batteries(e) > 1 && label === 'DETONAR') return false;
  if (color === 'white' && edge.lit(e, 'CAR')) return true;
  if (edge.batteries(e) > 2 && edge.lit(e, 'FRK')) return false;
  if (color === 'yellow') return true;
  if (color === 'red' && label === 'MANTENER') return false;
  return true;
}

export default {
  type: 'button',
  name: 'El botón',
  create(rng) {
    return {
      color: rng.pick(BUTTON_COLORS),
      label: rng.pick(BUTTON_LABELS),
      pressed: false,
      strip: null,
      secret: { strip: rng.pick(BUTTON_COLORS), pressedAt: 0 },
    };
  },
  handle(st, action, ctx) {
    if (action.type === 'press') {
      if (st.pressed) return null;
      st.pressed = true;
      st.strip = st.secret.strip;
      st.secret.pressedAt = ctx.now;
      return null;
    }
    if (action.type === 'release') {
      if (!st.pressed) return null;
      st.pressed = false;
      st.strip = null;
      const held = Number.isFinite(action.heldMs) ? action.heldMs : ctx.now - st.secret.pressedAt;
      const isHold = held >= HOLD_THRESHOLD_MS;
      if (!shouldHold(st, ctx.edgework)) return isHold ? 'strike' : 'solve';
      if (!isHold) return 'strike';
      const shown = ctx.timerString(action.timer);
      return shown.includes(String(STRIP_DIGIT[st.secret.strip])) ? 'solve' : 'strike';
    }
    return null;
  },
};

// Ciclo común de los módulos de necesidad: reposo -> activo (cuenta regresiva) -> reposo.
export function needyState(rng, extra) {
  return { active: false, timeLeft: 0, rate: 0, secret: { cooldown: rng.int(25, 50) }, ...extra };
}

export function needyTick(st, dt, ctx, { duration, onActivate, onExpire }) {
  if (!st.active) {
    st.secret.cooldown -= dt;
    if (st.secret.cooldown > 0) return { result: null, changed: false };
    st.active = true;
    st.timeLeft = duration;
    st.rate = -1;
    onActivate?.(st, ctx);
    return { result: null, changed: true };
  }
  st.timeLeft += st.rate * dt;
  if (st.timeLeft > 0) return { result: null, changed: false };
  return { result: onExpire(st, ctx), changed: true };
}

export function needyDeactivate(st, rng) {
  st.active = false;
  st.timeLeft = 0;
  st.rate = 0;
  st.secret.cooldown = rng.int(15, 40);
}

import { createRng } from './rng.js';
import { generateEdgework } from './edgework.js';
import { MODULES } from './modules/index.js';

export const TIMER_SLOT = 1; // centro superior del frente
export const FRONT_SLOTS = [0, 1, 2, 3, 4, 5];
export const BACK_SLOTS = [6, 7, 8, 9, 10, 11];

function pickTypes(rng, pool, n) {
  const out = [];
  while (out.length < n) out.push(...rng.shuffle(pool));
  return out.slice(0, n);
}

export function generateBomb(mission, seed) {
  const rng = createRng(seed);
  const edgework = generateEdgework(rng);
  const types = [
    ...pickTypes(rng, mission.pool, mission.modules),
    ...rng.sample(mission.needyPool, mission.needy),
  ];
  const freeSlots = [
    ...rng.shuffle(FRONT_SLOTS.filter((s) => s !== TIMER_SLOT)),
    ...rng.shuffle(BACK_SLOTS),
  ];
  // Mezclar el orden para que los módulos de necesidad no queden siempre al final.
  const modules = rng.shuffle(types).map((type, i) => ({
    id: i,
    type,
    slot: freeSlots[i],
    solved: false,
    state: MODULES[type].create(rng, edgework),
  }));
  return { seed, edgework, modules, rng };
}

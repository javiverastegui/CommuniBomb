import { REGULAR_TYPES, NEEDY_TYPES } from './modules/index.js';

export const MAX_SLOTS = 11; // 12 huecos en la carcasa, uno es el temporizador

export const DIFFICULTIES = {
  training: {
    name: 'Entrenamiento', blurb: 'Tres módulos sencillos para aprender a comunicarse.',
    time: 300, modules: 3, needy: 0, strikes: 3, pool: ['wires', 'button', 'keypad', 'memory', 'password'],
  },
  normal: {
    name: 'Normal', blurb: 'Cinco módulos al azar. La experiencia estándar.',
    time: 300, modules: 5, needy: 0, strikes: 3, pool: REGULAR_TYPES,
  },
  hard: {
    name: 'Difícil', blurb: 'Siete módulos y uno de necesidad que exige atención constante.',
    time: 300, modules: 7, needy: 1, strikes: 3, pool: REGULAR_TYPES,
  },
  expert: {
    name: 'Experto', blurb: 'Bomba llena: nueve módulos y dos de necesidad.',
    time: 360, modules: 9, needy: 2, strikes: 3, pool: REGULAR_TYPES,
  },
  custom: {
    name: 'Personalizada', blurb: 'Tú decides tiempo, módulos, strikes y necesidades.',
    time: 300, modules: 5, needy: 1, strikes: 3, pool: REGULAR_TYPES,
  },
};

export const DEFAULT_CUSTOM = { time: 300, modules: 5, needy: 1, strikes: 3, pool: [...REGULAR_TYPES], needyPool: [...NEEDY_TYPES] };

const clamp = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : d);

// Normaliza la configuración que llega del cliente.
export function sanitizeSettings(input = {}) {
  const difficulty = DIFFICULTIES[input.difficulty] ? input.difficulty : 'normal';
  const c = input.custom || {};
  const pool = Array.isArray(c.pool) ? c.pool.filter((t) => REGULAR_TYPES.includes(t)) : [];
  const needyPool = Array.isArray(c.needyPool) ? c.needyPool.filter((t) => NEEDY_TYPES.includes(t)) : [];
  const custom = {
    time: clamp(c.time, 60, 1200, DEFAULT_CUSTOM.time),
    modules: clamp(c.modules, 1, MAX_SLOTS, DEFAULT_CUSTOM.modules),
    needy: clamp(c.needy, 0, 3, DEFAULT_CUSTOM.needy),
    strikes: clamp(c.strikes, 1, 5, DEFAULT_CUSTOM.strikes),
    pool: pool.length ? pool : [...REGULAR_TYPES],
    needyPool: needyPool.length ? needyPool : [...NEEDY_TYPES],
  };
  if (custom.modules + custom.needy > MAX_SLOTS) custom.needy = MAX_SLOTS - custom.modules;
  return { difficulty, custom };
}

export function resolveMission(settings) {
  if (settings.difficulty === 'custom') {
    const c = settings.custom;
    return { name: 'Personalizada', time: c.time, modules: c.modules, needy: Math.min(c.needy, c.needyPool.length), strikes: c.strikes, pool: c.pool, needyPool: c.needyPool };
  }
  const d = DIFFICULTIES[settings.difficulty];
  return { ...d, needyPool: NEEDY_TYPES };
}

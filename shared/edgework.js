// Widgets de los costados de la bomba: número de serie, baterías, indicadores y puertos.

export const INDICATOR_LABELS = ['SND', 'CLR', 'CAR', 'IND', 'FRQ', 'SIG', 'NSA', 'MSA', 'TRN', 'BOB', 'FRK'];

export const PORTS = {
  dvi: 'DVI-D',
  parallel: 'Paralelo',
  ps2: 'PS/2',
  rj45: 'RJ-45',
  serial: 'Serie',
  rca: 'RCA estéreo',
};

const SERIAL_LETTERS = 'ABCDEFGHIJKLMNPQRSTUVWXZ'; // sin O ni Y (se confunden)
const DIGITS = '0123456789';

export function generateEdgework(rng) {
  const alnum = SERIAL_LETTERS + DIGITS;
  const serial =
    rng.pick(alnum) + rng.pick(alnum) + rng.pick(DIGITS) +
    rng.pick(SERIAL_LETTERS) + rng.pick(SERIAL_LETTERS) + rng.pick(DIGITS);

  const batteries = Array.from({ length: rng.int(0, 3) }, () =>
    rng.chance(0.5) ? { type: 'D', count: 1 } : { type: 'AA', count: 2 });

  const indicators = rng.sample(INDICATOR_LABELS, rng.int(0, 3))
    .map((label) => ({ label, lit: rng.chance(0.6) }));

  const plates = Array.from({ length: rng.int(0, 2) }, () => {
    const group = rng.chance(0.5) ? ['dvi', 'ps2', 'rj45', 'rca'] : ['serial', 'parallel'];
    return group.filter(() => rng.chance(0.5));
  });

  return { serial, batteries, indicators, plates };
}

export const edge = {
  batteries: (e) => e.batteries.reduce((s, b) => s + b.count, 0),
  holders: (e) => e.batteries.length,
  lastDigit: (e) => Number(e.serial[5]),
  lastDigitOdd: (e) => Number(e.serial[5]) % 2 === 1,
  lastDigitEven: (e) => Number(e.serial[5]) % 2 === 0,
  hasVowel: (e) => /[AEIOU]/.test(e.serial),
  hasPort: (e, p) => e.plates.some((pl) => pl.includes(p)),
  lit: (e, label) => e.indicators.some((i) => i.label === label && i.lit),
  unlit: (e, label) => e.indicators.some((i) => i.label === label && !i.lit),
};

import { createRng } from '../rng.js';

export const MAZE_SIZE = 6;
// Bits de pasajes abiertos por celda.
export const N = 1, E = 2, S = 4, W = 8;
const DIRS = { N: [0, -1, N, S], E: [1, 0, E, W], S: [0, 1, S, N], W: [-1, 0, W, E] };

function carve(rng) {
  const open = Array(MAZE_SIZE * MAZE_SIZE).fill(0);
  const seen = new Set();
  const stack = [rng.int(0, open.length - 1)];
  seen.add(stack[0]);
  while (stack.length) {
    const c = stack[stack.length - 1];
    const x = c % MAZE_SIZE, y = Math.floor(c / MAZE_SIZE);
    const options = Object.values(DIRS).filter(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < MAZE_SIZE && ny < MAZE_SIZE && !seen.has(ny * MAZE_SIZE + nx);
    });
    if (!options.length) { stack.pop(); continue; }
    const [dx, dy, bit, back] = rng.pick(options);
    const n = (y + dy) * MAZE_SIZE + x + dx;
    open[c] |= bit;
    open[n] |= back;
    seen.add(n);
    stack.push(n);
  }
  // Algunos atajos para que haya más de un camino.
  for (let k = 0; k < 4; k++) {
    const c = rng.int(0, open.length - 1);
    const x = c % MAZE_SIZE, y = Math.floor(c / MAZE_SIZE);
    if (x < MAZE_SIZE - 1 && rng.chance(0.5)) { open[c] |= E; open[c + 1] |= W; }
    else if (y < MAZE_SIZE - 1) { open[c] |= S; open[c + MAZE_SIZE] |= N; }
  }
  return open;
}

// Nueve laberintos fijos; cada uno con dos círculos que no se repiten en ningún otro.
const r = createRng(0xa3a2e);
const usedCircles = new Set();
export const MAZES = Array.from({ length: 9 }, () => {
  const open = carve(r);
  const circles = [];
  while (circles.length < 2) {
    const c = r.int(0, 35);
    if (usedCircles.has(c)) continue;
    usedCircles.add(c);
    circles.push(c);
  }
  return { open, circles };
});

function distance(open, a, b) {
  const dist = new Map([[a, 0]]);
  const q = [a];
  while (q.length) {
    const c = q.shift();
    if (c === b) return dist.get(c);
    for (const [dx, dy, bit] of Object.values(DIRS)) {
      if (!(open[c] & bit)) continue;
      const n = c + dy * MAZE_SIZE + dx;
      if (!dist.has(n)) { dist.set(n, dist.get(c) + 1); q.push(n); }
    }
  }
  return Infinity;
}

export default {
  type: 'maze',
  name: 'Laberinto',
  create(rng) {
    const m = rng.int(0, MAZES.length - 1);
    const { open, circles } = MAZES[m];
    let pos, goal;
    do {
      pos = rng.int(0, 35);
      goal = rng.int(0, 35);
    } while (distance(open, pos, goal) < 6);
    return { circles, pos, goal, secret: { maze: m } };
  },
  handle(st, action) {
    if (action.type !== 'move' || !DIRS[action.dir]) return null;
    const [dx, dy, bit] = DIRS[action.dir];
    const x = st.pos % MAZE_SIZE, y = Math.floor(st.pos / MAZE_SIZE);
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= MAZE_SIZE || ny >= MAZE_SIZE) return null; // borde: no hay pared que tocar
    if (!(MAZES[st.secret.maze].open[st.pos] & bit)) return 'strike';
    st.pos = ny * MAZE_SIZE + nx;
    return st.pos === st.goal ? 'solve' : null;
  },
};

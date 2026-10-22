import { generateBomb } from './bomb.js';
import { MODULES, publicView } from './modules/index.js';
import { formatTimer, timerRate } from './time.js';
import { randomSeed } from './rng.js';

const TICK_MS = 100;
const HEARTBEAT_MS = 1000;

// Partida autoritativa: el servidor lleva el reloj, los strikes y valida cada acción.
export class Game {
  constructor(mission, hooks, seed = randomSeed()) {
    this.mission = mission;
    this.hooks = hooks; // { onState(view), onFx(fx), onEnd(result) }
    this.bomb = generateBomb(mission, seed);
    this.remaining = mission.time;
    this.strikes = 0;
    this.ended = false;
    this.startedAt = 0;
    this.lastTick = 0;
  }

  start() {
    this.startedAt = this.lastTick = Date.now();
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.beatTimer = setInterval(() => this.pushState(), HEARTBEAT_MS);
    this.pushState();
  }

  stop() {
    clearInterval(this.tickTimer);
    clearInterval(this.beatTimer);
  }

  get rate() {
    return timerRate(this.strikes);
  }

  ctx(now) {
    return {
      now,
      edgework: this.bomb.edgework,
      strikes: this.strikes,
      remaining: this.remaining,
      rng: this.bomb.rng,
      timerString: (s) => this.validTimer(s),
    };
  }

  // Acepta el tiempo que vio el cliente si es coherente con el reloj del servidor (±1.5 s de latencia).
  validTimer(str) {
    if (typeof str === 'string') {
      for (let t = this.remaining - 1.5; t <= this.remaining + 1.5; t += 0.01) {
        if (formatTimer(t) === str) return str;
      }
    }
    return formatTimer(this.remaining);
  }

  tick() {
    if (this.ended) return;
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.remaining -= dt * this.rate;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.end(false, { cause: 'time' });
      return;
    }
    let dirty = false;
    for (const m of this.bomb.modules) {
      const def = MODULES[m.type];
      if (!def.needy) continue;
      const { result, changed } = def.tick(m.state, dt, this.ctx(now));
      if (changed) dirty = true;
      if (result === 'strike') this.strike(m);
      if (this.ended) return;
    }
    if (dirty) this.pushState();
  }

  action(moduleId, action) {
    if (this.ended || !action || typeof action.type !== 'string') return;
    const m = this.bomb.modules.find((x) => x.id === moduleId);
    if (!m || m.solved) return;
    const def = MODULES[m.type];
    const result = def.handle(m.state, action, this.ctx(Date.now()));
    if (result === 'strike') this.strike(m);
    else if (result === 'solve') this.solve(m);
    if (!this.ended) this.pushState();
  }

  solve(m) {
    m.solved = true;
    this.hooks.onFx({ type: 'solve', moduleId: m.id });
    const regular = this.bomb.modules.filter((x) => !MODULES[x.type].needy);
    if (regular.every((x) => x.solved)) this.end(true, { cause: 'defused' });
  }

  strike(m) {
    this.strikes++;
    this.hooks.onFx({ type: 'strike', moduleId: m.id, strikes: this.strikes });
    if (this.strikes >= this.mission.strikes) this.end(false, { cause: 'strikes', module: MODULES[m.type].name });
  }

  end(defused, info) {
    if (this.ended) return;
    this.ended = true;
    this.stop();
    const regular = this.bomb.modules.filter((x) => !MODULES[x.type].needy);
    this.hooks.onEnd({
      defused,
      ...info,
      mission: this.mission.name,
      remaining: this.remaining,
      elapsed: (Date.now() - this.startedAt) / 1000,
      strikes: this.strikes,
      strikesMax: this.mission.strikes,
      solved: regular.filter((x) => x.solved).length,
      total: regular.length,
      serial: this.bomb.edgework.serial,
    });
  }

  view() {
    return {
      mission: { name: this.mission.name, time: this.mission.time, strikes: this.mission.strikes },
      remaining: this.remaining,
      rate: this.rate,
      strikes: this.strikes,
      edgework: this.bomb.edgework,
      modules: this.bomb.modules.map((m) => ({
        id: m.id,
        type: m.type,
        slot: m.slot,
        solved: m.solved,
        needy: !!MODULES[m.type].needy,
        view: publicView(m.state),
      })),
    };
  }

  pushState() {
    if (!this.ended) this.hooks.onState(this.view());
  }
}

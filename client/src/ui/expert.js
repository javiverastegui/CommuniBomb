import { el, esc, fmtClock } from './dom.js';
import { mountManual } from '../manual/manual.js';

export class ExpertScreen {
  constructor(app) {
    this.app = app;
    this.el = el('div', 'expert', `
      <header class="topbar expert-bar">
        <div class="brand">Communi<span>Bomb</span></div>
        <span class="status"><i class="led red blink"></i><span data-status>Bomba activa</span></span>
        <div class="spacer"></div>
        <span class="hud-chip" data-code></span>
        <button class="btn ghost sm" data-act="leave">Salir</button>
      </header>
      <div data-manual></div>
    `);
    mountManual(this.el.querySelector('[data-manual]'), { embedded: true });
    this.el.querySelector('[data-act="leave"]').addEventListener('click', () => app.leave());
    this.timer = setInterval(() => this.tick(), 1000);
  }

  update(room) {
    this.room = room;
    const defuser = room.players.find((p) => p.role === 'defuser');
    this.el.querySelector('[data-code]').innerHTML = `Sala <b>${esc(room.code)}</b>`;
    this.defuserName = defuser?.name || 'el desactivador';
    this.tick();
  }

  tick() {
    if (!this.room?.startedAt) return;
    const elapsed = (Date.now() - this.room.startedAt) / 1000;
    this.el.querySelector('[data-status]').textContent = `${this.defuserName} desactiva · ${fmtClock(elapsed)}`;
  }

  destroy() {
    clearInterval(this.timer);
  }
}

export class ManualScreen {
  constructor() {
    this.el = el('div', 'expert', `
      <header class="topbar">
        <div class="brand">Communi<span>Bomb</span></div>
        <div class="spacer"></div>
        <a class="btn ghost sm" href="/">Inicio</a>
      </header>
      <div data-manual></div>
    `);
    mountManual(this.el.querySelector('[data-manual]'), { embedded: false });
  }
}

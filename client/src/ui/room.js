import { el, esc, screws, toast, fmtClock, HOW_TO_PLAY } from './dom.js';
import { DIFFICULTIES, MAX_SLOTS } from '@shared/missions.js';
import { MODULES, REGULAR_TYPES, NEEDY_TYPES } from '@shared/modules/index.js';

const ORDER = ['training', 'normal', 'hard', 'expert', 'custom'];

export class RoomScreen {
  constructor(app) {
    this.app = app;
    this.el = el('div', 'atmos', `
      <header class="topbar">
        <div class="brand">Communi<span>Bomb</span></div>
        <div class="spacer"></div>
        <a class="btn ghost sm" href="/#manual" target="_blank" rel="noopener">Manual</a>
        <button class="btn ghost sm" data-act="leave">Salir</button>
      </header>
      <main class="room">
        <div class="col">
          <section class="panel code-card">${screws}
            <p class="eyebrow">Código de sala</p>
            <div class="code-digits" aria-live="polite"></div>
            <p class="muted small" style="margin:0">Compártelo con tu equipo y entren a una llamada de voz: solo pueden comunicarse hablando.</p>
            <div class="code-actions">
              <button class="btn sm" data-act="copy-link">Copiar enlace</button>
              <button class="btn ghost sm" data-act="copy-code">Copiar código</button>
            </div>
          </section>
          <section class="panel">${screws}
            <p class="eyebrow">Equipo · <span data-count></span></p>
            <ul class="players"></ul>
          </section>
        </div>
        <div class="col">
          <section class="panel">${screws}
            <p class="eyebrow">Misión</p>
            <div class="missions"></div>
            <div data-custom></div>
          </section>
          <section class="panel start-bar">${screws}
            <button class="btn primary big block" data-act="start">Armar bomba</button>
            <p class="start-note"></p>
          </section>
          <section class="panel">${screws}
            <p class="eyebrow">Cómo se juega</p>
            ${HOW_TO_PLAY}
          </section>
        </div>
      </main>
    `);

    this.el.addEventListener('click', (e) => this.onClick(e));
  }

  get isHost() {
    return this.room?.hostId === this.app.identity.id;
  }

  async onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const { act } = t.dataset;
    const room = this.room;
    const link = `${location.origin}/?sala=${room.code}`;
    if (act === 'leave') this.app.leave();
    else if (act === 'copy-link') this.copy(link, 'Enlace copiado.');
    else if (act === 'copy-code') this.copy(room.code, 'Código copiado.');
    else if (act === 'role') this.app.send('room:role', { playerId: t.dataset.id, role: t.dataset.role });
    else if (act === 'mission') this.pushSettings({ difficulty: t.dataset.id });
    else if (act === 'step') {
      const c = { ...room.settings.custom };
      const { key } = t.dataset;
      const step = Number(t.dataset.step);
      c[key] = c[key] + step;
      if (key === 'modules' && c.modules + c.needy > MAX_SLOTS) c.needy = Math.max(0, MAX_SLOTS - c.modules);
      if (key === 'needy' && c.modules + c.needy > MAX_SLOTS) return;
      this.pushSettings({ custom: c });
    } else if (act === 'pool' || act === 'needyPool') {
      const c = { ...room.settings.custom };
      const list = new Set(c[act]);
      list.has(t.dataset.type) ? list.delete(t.dataset.type) : list.add(t.dataset.type);
      if (!list.size) return toast('Deja al menos un tipo de módulo.');
      c[act] = [...list];
      this.pushSettings({ custom: c });
    } else if (act === 'start') {
      t.disabled = true;
      const res = await this.app.request('game:start');
      t.disabled = false;
      if (!res.ok) toast(res.error || 'No se pudo iniciar.');
    }
  }

  pushSettings(patch) {
    if (!this.isHost) return;
    this.app.send('room:settings', { ...this.room.settings, ...patch });
  }

  async copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg, 'info');
    } catch {
      toast(text, 'info');
    }
  }

  update(room) {
    this.room = room;
    const me = this.app.identity.id;
    const host = this.isHost;
    const $ = (s) => this.el.querySelector(s);

    $('.code-digits').innerHTML = [...room.code].map((c) => `<span>${c}</span>`).join('');
    $('[data-count]').textContent = `${room.players.length}/8`;

    $('.players').innerHTML = room.players.map((p) => {
      const tags = [
        `<span class="tag role-${p.role}">${p.role === 'defuser' ? 'Desactivador' : 'Experto'}</span>`,
        p.id === room.hostId ? '<span class="tag host">Anfitrión</span>' : '',
        p.id === me ? '<span class="tag host">Tú</span>' : '',
        !p.connected ? '<span class="tag host">Desconectado</span>' : '',
      ].join('');
      let action = '';
      if (p.role !== 'defuser' && (host || p.id === me)) {
        action = `<button class="btn sm" data-act="role" data-role="defuser" data-id="${esc(p.id)}">${p.id === me ? 'Quiero desactivar' : 'Desactivador'}</button>`;
      }
      return `<li class="player ${p.id === me ? 'me' : ''} ${p.connected ? '' : 'off'}">
        <i class="led ${p.connected ? 'on' : ''}" aria-label="${p.connected ? 'conectado' : 'desconectado'}"></i>
        <div style="min-width:0"><div class="name">${esc(p.name)}</div><div class="meta">${tags}</div></div>
        ${action}</li>`;
    }).join('');

    const s = room.settings;
    $('.missions').innerHTML = ORDER.map((id) => {
      const d = id === 'custom' ? { ...DIFFICULTIES.custom, ...s.custom } : DIFFICULTIES[id];
      const spec = `${d.modules} mód · ${fmtClock(d.time)}${d.needy ? ` · ${d.needy} nec.` : ''}`;
      return `<button class="mission" data-act="mission" data-id="${id}" aria-pressed="${s.difficulty === id}" ${host ? '' : 'disabled'}>
        <span class="mname">${d.name}</span><span class="mspec">${spec}</span>
        <span class="mblurb">${d.blurb}</span></button>`;
    }).join('');

    const custom = $('[data-custom]');
    if (s.difficulty === 'custom') {
      const c = s.custom;
      const dis = host ? '' : 'disabled';
      const stepper = (key, label, value, step, min, max) => `
        <div class="stepper"><span>${label}</span><div class="ctrl">
          <button data-act="step" data-key="${key}" data-step="${-step}" ${dis || (c[key] - step < min ? 'disabled' : '')} aria-label="Menos">−</button>
          <output>${value}</output>
          <button data-act="step" data-key="${key}" data-step="${step}" ${dis || (c[key] + step > max ? 'disabled' : '')} aria-label="Más">+</button>
        </div></div>`;
      const chips = (act, types, selected) => `<div class="chips">${types.map((t) =>
        `<button class="chip" data-act="${act}" data-type="${t}" aria-pressed="${selected.includes(t)}" ${dis}>${MODULES[t].name}</button>`).join('')}</div>`;
      custom.innerHTML = `<div class="custom">
        ${stepper('time', 'Tiempo', fmtClock(c.time), 30, 60, 1200)}
        ${stepper('modules', 'Módulos', c.modules, 1, 1, MAX_SLOTS)}
        ${stepper('needy', 'De necesidad', c.needy, 1, 0, 3)}
        ${stepper('strikes', 'Strikes para explotar', c.strikes, 1, 1, 5)}
        <div class="field"><label>Módulos posibles</label>${chips('pool', REGULAR_TYPES, c.pool)}</div>
        <div class="field"><label>Módulos de necesidad</label>${chips('needyPool', NEEDY_TYPES, c.needyPool)}</div>
      </div>`;
    } else custom.innerHTML = '';

    const start = $('[data-act="start"]');
    const note = $('.start-note');
    const defuser = room.players.find((p) => p.role === 'defuser');
    const hostName = room.players.find((p) => p.id === room.hostId)?.name || 'el anfitrión';
    start.hidden = !host;
    start.disabled = !defuser?.connected;
    if (!defuser) note.textContent = 'Falta elegir un desactivador.';
    else if (!host) note.textContent = `Esperando a que ${hostName} arme la bomba…`;
    else note.textContent = room.players.length < 2
      ? 'Puedes jugar solo abriendo el manual en otra pestaña, pero es mejor con amigos.'
      : `${defuser.name} desactiva. Los demás, a leer el manual.`;
  }
}

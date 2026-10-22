import { el, screws, toast, modal, fmtClock, HOW_TO_PLAY } from './dom.js';
import { DIFFICULTIES } from '@shared/missions.js';

export class HomeScreen {
  constructor(app) {
    this.app = app;
    this.el = el('div', 'atmos home', `
      <div class="hazard-band"></div>
      <main class="home-main">
        <section>
          <p class="eyebrow">Unidad de desactivación · canal seguro</p>
          <h1 class="display hero-title">Communi<span class="b">Bomb<i class="led red blink" aria-hidden="true"></i></span></h1>
          <p class="hero-tag">Uno tiene la bomba. Los demás tienen el manual. <strong>Nadie ve lo que ve el otro.</strong> Hablen rápido.</p>
          <div class="hero-meta">
            <div><b>11</b>módulos</div>
            <div><b>3</b>de necesidad</div>
            <div><b>2–8</b>jugadores</div>
          </div>
        </section>
        <section class="panel entry" aria-label="Entrar a una sala">
          ${screws}
          <div class="field">
            <label for="cb-name">Tu nombre en clave</label>
            <input id="cb-name" class="input" maxlength="16" autocomplete="nickname" placeholder="p. ej. Halcón" />
          </div>
          <button class="btn primary big block" data-act="create">Crear sala</button>
          <div class="divider">o únete con un código</div>
          <form class="join-row" novalidate>
            <input class="input code" name="code" maxlength="4" placeholder="ABCD" aria-label="Código de sala"
              autocapitalize="characters" autocomplete="off" spellcheck="false" />
            <button class="btn" type="submit">Entrar</button>
          </form>
          <div class="entry-links">
            <a class="btn ghost sm" href="/#manual" target="_blank" rel="noopener">Abrir manual</a>
            <button class="btn ghost sm" data-act="how">Cómo se juega</button>
            <button class="btn ghost sm" data-act="practice">Práctica individual</button>
          </div>
        </section>
      </main>
      <footer class="home-foot">Juego de fans no oficial, inspirado en Keep Talking and Nobody Explodes.</footer>
    `);

    const name = this.el.querySelector('#cb-name');
    const code = this.el.querySelector('.code');
    name.value = app.identity.name;
    const preset = new URLSearchParams(location.search).get('sala');
    if (preset) code.value = preset.toUpperCase().slice(0, 4);

    const getName = () => {
      const v = name.value.trim();
      if (!v) { toast('Primero escribe tu nombre.'); name.focus(); return null; }
      app.identity.name = v;
      return v;
    };

    code.addEventListener('input', () => {
      code.value = code.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    });

    const createBtn = this.el.querySelector('[data-act="create"]');
    createBtn.addEventListener('click', async () => {
      const n = getName();
      if (!n) return;
      createBtn.disabled = true;
      const res = await app.request('room:create', { name: n, clientId: app.identity.id });
      createBtn.disabled = false;
      if (!res.ok) toast(res.error || 'No se pudo crear la sala.');
    });

    this.el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = getName();
      if (!n) return;
      if (code.value.length !== 4) { toast('El código tiene 4 letras.'); code.focus(); return; }
      const res = await app.request('room:join', { code: code.value, name: n, clientId: app.identity.id });
      if (!res.ok) toast(res.error || 'No se pudo entrar.');
    });

    this.el.querySelector('[data-act="how"]').addEventListener('click', () =>
      modal(`<p class="eyebrow">Briefing</p><h2 class="display" style="font-size:2rem">Cómo se juega</h2>${HOW_TO_PLAY}
        <p class="muted small" style="margin-top:16px">Consejo: el experto puede abrir el manual en el celular mientras está en la llamada.</p>
        <button class="btn block" data-close style="margin-top:8px">Entendido</button>`));

    this.el.querySelector('[data-act="practice"]').addEventListener('click', () =>
      modal(`<p class="eyebrow">Sin conexión</p><h2 class="display" style="font-size:2rem">Práctica individual</h2>
        <p class="muted small">Desactiva tú solo con el manual abierto en otra pestaña o en otro dispositivo.</p>
        <div class="missions">${['training', 'normal', 'hard', 'expert'].map((id) => {
          const d = DIFFICULTIES[id];
          return `<button class="mission" data-practice="${id}"><span class="mname">${d.name}</span>
            <span class="mspec">${d.modules} mód · ${fmtClock(d.time)}${d.needy ? ` · ${d.needy} nec.` : ''}</span>
            <span class="mblurb">${d.blurb}</span></button>`;
        }).join('')}</div>
        <div class="entry-links" style="margin-top:16px">
          <a class="btn sm" href="/#manual" target="_blank" rel="noopener">Abrir manual</a>
          <button class="btn ghost sm" data-close>Cancelar</button>
        </div>`, (back, close) => back.addEventListener('click', (e) => {
        const id = e.target.closest('[data-practice]')?.dataset.practice;
        if (id) { close(); app.startPractice(id); }
      })));

    setTimeout(() => (name.value ? (preset ? this.el.querySelector('form .btn') : this.el.querySelector('[data-act="create"]')) : name).focus(), 50);
  }
}

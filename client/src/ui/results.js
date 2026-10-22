import { el, esc, screws, fmtClock } from './dom.js';
import { formatTimer } from '@shared/time.js';

// handlers: { again?, lobby?, leave } — los ausentes no se muestran.
export class ResultsScreen {
  constructor(handlers) {
    this.handlers = handlers;
    this.el = el('div', 'atmos results');
    this.el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act) this.handlers[act]?.();
    });
  }

  update({ result: r, canControl, waitingFor }) {
    const key = JSON.stringify(r) + canControl;
    if (!r || this.key === key) return;
    this.key = key;
    const cause = r.defused
      ? `Desactivada con ${formatTimer(r.remaining)} restantes.`
      : r.cause === 'time'
        ? 'Se acabó el tiempo.'
        : `Demasiados errores. El último strike fue en «${esc(r.module)}».`;
    const h = this.handlers;
    this.el.innerHTML = `
      <div class="panel results-card">${screws}
        <p class="eyebrow" style="justify-content:center">Informe de misión · ${esc(r.mission)} · Serie ${esc(r.serial)}</p>
        <div class="stamp ${r.defused ? 'win' : 'lose'}">${r.defused ? 'DESACTIVADA' : 'DETONADA'}</div>
        <p class="cause">${cause}</p>
        <div class="stats">
          <div class="stat"><b>${fmtClock(r.elapsed)}</b><span>Tiempo usado</span></div>
          <div class="stat"><b>${r.solved}/${r.total}</b><span>Módulos</span></div>
          <div class="stat"><b>${r.strikes}/${r.strikesMax}</b><span>Strikes</span></div>
          <div class="stat"><b>${r.defused ? formatTimer(r.remaining) : '—'}</b><span>Restante</span></div>
        </div>
        <div class="results-actions">
          ${canControl
            ? `${h.again ? '<button class="btn primary big" data-act="again">Otra bomba</button>' : ''}
               ${h.lobby ? `<button class="btn big" data-act="lobby">${h.lobbyLabel || 'Cambiar misión o roles'}</button>` : ''}`
            : `<p class="muted" style="width:100%">Esperando a ${esc(waitingFor || 'el anfitrión')}…</p>`}
          <button class="btn ghost big" data-act="leave">Salir</button>
        </div>
      </div>`;
  }
}

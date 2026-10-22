import { el, esc } from './dom.js';
import { BombView } from '../bomb3d/BombView.js';
import { audio } from '../audio.js';

export class DefuserScreen {
  constructor({ onAction, label }) {
    this.busyUntil = 0;
    this.el = el('div', 'defuser', `
      <div class="stage" style="position:absolute;inset:0"></div>
      <div class="vignette"></div>
      <div class="hud tl">
        <span class="hud-chip">Misión <b data-mission>—</b></span>
        ${label ? `<span class="hud-chip">${esc(label)}</span>` : ''}
      </div>
      <div class="hud tr">
        <button class="btn sm" data-act="back" hidden>← Alejar</button>
        <button class="btn sm" data-act="flip">Voltear</button>
        <button class="btn sm" data-act="mute" aria-label="Sonido"></button>
      </div>
      <div class="hud bc"><p class="hint">Arrastra para girar · Toca un módulo para acercarte<span class="kbd-only"> · <kbd>Espacio</kbd> voltear · <kbd>Esc</kbd> alejar</span></p></div>
      <div class="flash" aria-hidden="true"></div>
      <div class="intro" aria-hidden="true"><p class="display">Bomba armada</p></div>
    `);
    this.flashEl = this.el.querySelector('.flash');
    const mute = this.el.querySelector('[data-act="mute"]');
    const back = this.el.querySelector('[data-act="back"]');
    const paintMute = () => (mute.textContent = audio.muted ? 'Sonido: no' : 'Sonido: sí');
    paintMute();

    // Se crea al siguiente frame, cuando el contenedor ya está en el DOM.
    requestAnimationFrame(() => {
      this.view = new BombView(this.el.querySelector('.stage'), { onAction });
      this.view.onFocusChange = (f) => (back.hidden = !f);
      if (this.pending) this.view.setState(this.pending);
    });
    audio.start();

    this.el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'flip') this.view?.flip();
      else if (act === 'back') this.view?.unfocus();
      else if (act === 'mute') { audio.toggleMute(); paintMute(); }
    });
  }

  onState(state) {
    this.el.querySelector('[data-mission]').textContent = state.mission.name;
    if (this.view) this.view.setState(state);
    else this.pending = state;
  }

  onFx(fx) {
    this.view?.fx(fx);
    if (fx.type === 'strike') this.flash('strike');
  }

  onEnd(result) {
    this.view?.end(result);
    this.busyUntil = performance.now() + (result.defused ? 2200 : 3000);
    if (!result.defused) this.flash('boom');
  }

  flash(kind) {
    this.flashEl.className = 'flash';
    void this.flashEl.offsetWidth;
    this.flashEl.className = `flash ${kind}`;
  }

  destroy() {
    this.view?.dispose();
  }
}

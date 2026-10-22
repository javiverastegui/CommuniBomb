const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

export const screws = '<i class="screw tl"></i><i class="screw tr"></i><i class="screw bl"></i><i class="screw br"></i>';

let toastTimer;
export function toast(msg, kind = 'error') {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const t = el('div', `toast ${kind}`, esc(msg));
  t.setAttribute('role', 'status');
  document.body.appendChild(t);
  toastTimer = setTimeout(() => t.remove(), 3200);
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function modal(html, onMount) {
  const back = el('div', 'modal-back', `<div class="panel modal" role="dialog" aria-modal="true">${screws}${html}</div>`);
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  onMount?.(back, close);
  back.querySelector('button, a, input')?.focus();
  return close;
}

export const HOW_TO_PLAY = `
  <ol class="how">
    <li><span><strong>Un desactivador</strong> ve la bomba en 3D. No tiene manual.</span></li>
    <li><span><strong>Los expertos</strong> ven el manual de desactivación. No ven la bomba.</span></li>
    <li><span>Pónganse en <strong>una llamada de voz</strong> (Discord, Meet, en persona). Solo pueden comunicarse hablando.</span></li>
    <li><span>Desactiven todos los módulos antes de que el tiempo llegue a cero. <strong>Cada error es un strike</strong> y acelera el reloj.</span></li>
  </ol>`;

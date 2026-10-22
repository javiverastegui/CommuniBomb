import { esc } from '../ui/dom.js';
import { createRng } from '@shared/rng.js';
import { MODULES } from '@shared/modules/index.js';
import { INDICATOR_LABELS, PORTS } from '@shared/edgework.js';
import { STRIP_DIGIT } from '@shared/modules/button.js';
import { KEYPAD_COLUMNS } from '@shared/modules/keypad.js';
import { SIMON_MAP } from '@shared/modules/simon.js';
import { WHO_DISPLAY, WHO_DISPLAY_POS, WHO_GROUPS, WHO_LISTS } from '@shared/modules/who.js';
import { MORSE_CODE, MORSE_WORDS } from '@shared/modules/morse.js';
import { COMPLICATED_RULES } from '@shared/modules/complicated.js';
import { SEQUENCE_TABLE } from '@shared/modules/sequence.js';
import { MAZES, MAZE_SIZE, N, E, S, W } from '@shared/modules/maze.js';
import { PASSWORDS } from '@shared/modules/password.js';
import { KNOB_PATTERNS, KNOB_DIR_NAMES } from '@shared/modules/knob.js';
import { CAPACITOR_MAX } from '@shared/modules/capacitor.js';
import { FACES, timerFace } from '../faces/index.js';
import { PX } from '../faces/kit.js';
import { drawPort } from '../bomb3d/widgets.js';

const THEME_KEY = 'cb.manualTheme';
const COLOR_NAMES = { red: 'Rojo', blue: 'Azul', green: 'Verde', yellow: 'Amarillo', white: 'Blanco', black: 'Negro' };
const DOT = (c) => `<i class="swatch ${c}"></i>`;

// ---------- Vistas previas: se dibujan con las mismas caras que ve el desactivador ----------
function previewView(type) {
  const rng = createRng(1234 + type.length * 17);
  const edge = { serial: 'AB1CD2', batteries: [], indicators: [], plates: [] };
  const { secret, ...view } = MODULES[type].create(rng, edge);
  if (MODULES[type].needy) Object.assign(view, { active: true, timeLeft: 27, rate: 0 });
  if (type === 'knob') view.leds = KNOB_PATTERNS[0].top + KNOB_PATTERNS[0].bottom;
  if (type === 'vent') view.question = 'vent';
  if (type === 'capacitor') view.timeLeft = CAPACITOR_MAX * 0.45;
  return view;
}

function renderPreview(face, view) {
  const c = document.createElement('canvas');
  c.width = c.height = PX;
  const ui = { t: 0.1, age: 0, hover: null, pressed: null, local: {}, glowCtx: null, solved: false,
    audio: new Proxy({}, { get: () => () => {} }), timerString: () => '' };
  face.draw(c.getContext('2d'), view, ui);
  return c.toDataURL('image/webp', 0.86);
}

function portImage(id) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 140;
  const g = c.getContext('2d');
  g.fillStyle = '#6b7068';
  g.fillRect(0, 0, 320, 140);
  drawPort(g, id, 160, 70);
  return c.toDataURL('image/webp', 0.9);
}

const fig = (type, caption) => `<figure class="mod-fig" data-preview="${type}"><div class="mod-img"></div><figcaption>${caption}</figcaption></figure>`;

// ---------- Secciones ----------
function sectionIntro() {
  return `
  <p class="lede">Bienvenido al delicado oficio de la desactivación de bombas. Este manual es lo único que tienes; la bomba la tiene otra persona. Ella describe, tú interpretas, y entre los dos deciden qué cortar.</p>
  <h3>Lo básico</h3>
  <ul>
    <li>La bomba explota si el <b>temporizador llega a cero</b> o si se acumulan demasiados <b>strikes</b>. Por defecto, el tercer strike la detona.</li>
    <li>Cada strike aparece como una <b>✕</b> roja sobre el temporizador y hace que el reloj corra <b>más rápido</b>.</li>
    <li>Cada módulo tiene un <b>LED</b> en su esquina superior derecha. Se enciende en <b>verde</b> cuando ese módulo queda desactivado.</li>
    <li>Para desactivar la bomba hay que resolver <b>todos los módulos con LED</b>.</li>
  </ul>
  ${fig('timer', 'Temporizador con un strike')}
  <h3>Módulos de necesidad</h3>
  <p>Llevan una <b>franja amarilla y negra</b> en el borde superior y una pantalla roja de dos dígitos. No se pueden desactivar: se activan cada cierto tiempo y deben atenderse antes de que su cuenta llegue a cero, o se produce un strike.</p>
  <h3>El exterior de la bomba</h3>
  <p>Muchas instrucciones dependen de lo que hay en los <b>costados</b> de la carcasa: número de serie, baterías, indicadores y puertos. Pide al desactivador que gire la bomba y te los describa. Los detalles están en los <a href="#sec-apendice">apéndices</a>.</p>
  <div class="note">Consejo: anota el número de serie, la cantidad de baterías y los indicadores encendidos al comienzo. Se usan en muchos módulos.</div>`;
}

function sectionWires() {
  const rules = {
    3: ['Si no hay cables rojos, corta el <b>segundo</b> cable.', 'Si no, si el último cable es blanco, corta el <b>último</b> cable.', 'Si no, si hay más de un cable azul, corta el <b>último cable azul</b>.', 'Si no, corta el <b>último</b> cable.'],
    4: ['Si hay más de un cable rojo y el último dígito del número de serie es impar, corta el <b>último cable rojo</b>.', 'Si no, si el último cable es amarillo y no hay cables rojos, corta el <b>primer</b> cable.', 'Si no, si hay exactamente un cable azul, corta el <b>primer</b> cable.', 'Si no, si hay más de un cable amarillo, corta el <b>último</b> cable.', 'Si no, corta el <b>segundo</b> cable.'],
    5: ['Si el último cable es negro y el último dígito del número de serie es impar, corta el <b>cuarto</b> cable.', 'Si no, si hay exactamente un cable rojo y más de un cable amarillo, corta el <b>primer</b> cable.', 'Si no, si no hay cables negros, corta el <b>segundo</b> cable.', 'Si no, corta el <b>primer</b> cable.'],
    6: ['Si no hay cables amarillos y el último dígito del número de serie es impar, corta el <b>tercer</b> cable.', 'Si no, si hay exactamente un cable amarillo y más de un cable blanco, corta el <b>cuarto</b> cable.', 'Si no, si no hay cables rojos, corta el <b>último</b> cable.', 'Si no, corta el <b>cuarto</b> cable.'],
  };
  return `
  ${fig('wires', 'Módulo de cables')}
  <p>Un módulo de cables tiene entre 3 y 6 cables de colores. Solo hay que cortar <b>uno</b>. Los cables se cuentan de <b>arriba hacia abajo</b>, ignorando los huecos vacíos.</p>
  <div class="rule-grid">${Object.entries(rules).map(([n, list]) => `
    <div class="rule-card"><h4>${n} cables</h4><ol>${list.map((r) => `<li>${r}</li>`).join('')}</ol></div>`).join('')}
  </div>`;
}

function sectionButton() {
  return `
  ${fig('button', 'El botón')}
  <p>Sigue estas reglas <b>en orden</b>; aplica solo la primera que se cumpla.</p>
  <ol class="steps">
    <li>Si el botón es <b>azul</b> y dice «ABORTAR», mantenlo presionado y consulta <a href="#hold">Soltar el botón</a>.</li>
    <li>Si hay <b>más de 1 batería</b> y el botón dice «DETONAR», presiónalo y suéltalo enseguida.</li>
    <li>Si el botón es <b>blanco</b> y hay un indicador encendido con la etiqueta <b>CAR</b>, mantenlo presionado.</li>
    <li>Si hay <b>más de 2 baterías</b> y un indicador encendido con la etiqueta <b>FRK</b>, presiónalo y suéltalo enseguida.</li>
    <li>Si el botón es <b>amarillo</b>, mantenlo presionado.</li>
    <li>Si el botón es <b>rojo</b> y dice «MANTENER», presiónalo y suéltalo enseguida.</li>
    <li>Si nada de lo anterior aplica, mantenlo presionado.</li>
  </ol>
  <h3 id="hold">Soltar el botón</h3>
  <p>Al mantenerlo presionado, se ilumina una <b>franja de color</b> a la derecha. Suéltalo cuando el temporizador muestre el dígito indicado <b>en cualquier posición</b>.</p>
  <table class="tbl compact"><thead><tr><th>Franja</th><th>Soltar cuando aparezca un…</th></tr></thead><tbody>
    ${Object.entries(STRIP_DIGIT).map(([c, d]) => `<tr><td>${DOT(c)} ${COLOR_NAMES[c]}</td><td class="big">${d}</td></tr>`).join('')}
  </tbody></table>
  <div class="note">Si el botón debe soltarse «enseguida», no lo mantengas más de medio segundo.</div>`;
}

function sectionKeypad() {
  return `
  ${fig('keypad', 'Teclado de símbolos')}
  <p>El teclado muestra cuatro símbolos. Solo <b>una</b> de las columnas de abajo contiene los cuatro. Presiona los botones en el <b>orden en que aparecen en esa columna</b>, de arriba hacia abajo.</p>
  <div class="keypad-cols">${KEYPAD_COLUMNS.map((col, i) => `
    <div class="kcol"><span class="kcol-n">${i + 1}</span>${col.map((s) => `<span class="kglyph">${s}</span>`).join('')}</div>`).join('')}
  </div>`;
}

function sectionSimon() {
  const table = (rows, title) => `
    <div class="rule-card"><h4>${title}</h4>
    <table class="tbl simon"><thead><tr><th>Destello →</th>${['red', 'blue', 'green', 'yellow'].map((c) => `<th>${DOT(c)}<span>${COLOR_NAMES[c]}</span></th>`).join('')}</tr></thead>
    <tbody>${rows.map((row, s) => `<tr><th>${s} strike${s === 1 ? '' : 's'}${s === 2 ? '+' : ''}</th>${['red', 'blue', 'green', 'yellow'].map((c) => `<td>${DOT(row[c])}<span>${COLOR_NAMES[row[c]]}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `
  ${fig('simon', 'Simón dice')}
  <ol class="steps">
    <li>Uno de los cuatro botones parpadeará. Usa la tabla para saber qué botón presionar.</li>
    <li>Después, el mismo botón parpadeará seguido de otro. Repite la secuencia completa, traducida con la tabla.</li>
    <li>La secuencia crece hasta que el módulo se desactiva.</li>
  </ol>
  <div class="note">La tabla depende de los <b>strikes actuales de la bomba</b>: si reciben un strike en cualquier módulo, cambia de fila.</div>
  <div class="rule-grid two">
    ${table(SIMON_MAP.vowel, 'Si el número de serie TIENE una vocal')}
    ${table(SIMON_MAP.noVowel, 'Si el número de serie NO tiene vocales')}
  </div>`;
}

const POS_NAMES = ['arriba a la izquierda', 'arriba a la derecha', 'al medio a la izquierda', 'al medio a la derecha', 'abajo a la izquierda', 'abajo a la derecha'];

function sectionWho() {
  const mini = (pos) => `<span class="mini">${[0, 1, 2, 3, 4, 5].map((i) => `<i class="${i === pos ? 'on' : ''}"></i>`).join('')}</span>`;
  return `
  ${fig('who', '¿Quién va primero?')}
  <p>Este módulo tiene una pantalla y seis botones con palabras. Hay que superar <b>tres etapas</b>. Un error reinicia la etapa con palabras nuevas.</p>
  <h3>Paso 1 — Lee la pantalla</h3>
  <p>Según la palabra de la pantalla, el desactivador debe leer la etiqueta del botón marcado. <b>Ojo con las tildes</b>: «SÍ» y «SI» son distintas.</p>
  <div class="who-grid">${WHO_DISPLAY.map((w) => `
    <div class="who-cell">${w ? `<span class="lcd-word">${esc(w)}</span>` : '<span class="lcd-word empty">(pantalla vacía)</span>'}${mini(WHO_DISPLAY_POS[w])}</div>`).join('')}
  </div>
  <h3>Paso 2 — Busca la etiqueta</h3>
  <p>Busca abajo la etiqueta que leyó el desactivador. Presiona el <b>primer</b> botón de esa lista que esté en el módulo.</p>
  ${WHO_GROUPS.map((g) => `<dl class="who-lists">${g.map((w) => `<div><dt>${esc(w)}</dt><dd>${WHO_LISTS[w].map(esc).join(', ')}</dd></div>`).join('')}</dl>`).join('')}
  <p class="small muted">Las posiciones: ${POS_NAMES.map((p, i) => `${mini(i)} ${p}`).join(' · ')}</p>`;
}

function sectionMemory() {
  const stages = [
    ['Si la pantalla muestra 1, presiona el botón en la <b>segunda</b> posición.', 'Si muestra 2, presiona el botón en la <b>segunda</b> posición.', 'Si muestra 3, presiona el botón en la <b>tercera</b> posición.', 'Si muestra 4, presiona el botón en la <b>cuarta</b> posición.'],
    ['Si la pantalla muestra 1, presiona el botón con la etiqueta <b>«4»</b>.', 'Si muestra 2, presiona el botón en la <b>misma posición</b> que en la etapa 1.', 'Si muestra 3, presiona el botón en la <b>primera</b> posición.', 'Si muestra 4, presiona el botón en la <b>misma posición</b> que en la etapa 1.'],
    ['Si la pantalla muestra 1, presiona el botón con la <b>misma etiqueta</b> que en la etapa 2.', 'Si muestra 2, presiona el botón con la <b>misma etiqueta</b> que en la etapa 1.', 'Si muestra 3, presiona el botón en la <b>tercera</b> posición.', 'Si muestra 4, presiona el botón con la etiqueta <b>«4»</b>.'],
    ['Si la pantalla muestra 1, presiona el botón en la <b>misma posición</b> que en la etapa 1.', 'Si muestra 2, presiona el botón en la <b>primera</b> posición.', 'Si muestra 3, presiona el botón en la <b>misma posición</b> que en la etapa 2.', 'Si muestra 4, presiona el botón en la <b>misma posición</b> que en la etapa 2.'],
    ['Si la pantalla muestra 1, presiona el botón con la <b>misma etiqueta</b> que en la etapa 1.', 'Si muestra 2, presiona el botón con la <b>misma etiqueta</b> que en la etapa 2.', 'Si muestra 3, presiona el botón con la <b>misma etiqueta</b> que en la etapa 4.', 'Si muestra 4, presiona el botón con la <b>misma etiqueta</b> que en la etapa 3.'],
  ];
  return `
  ${fig('memory', 'Memoria')}
  <p>Presiona el botón correcto para avanzar de etapa; son <b>cinco</b>. Un error reinicia el módulo desde la etapa 1. Las posiciones se cuentan de <b>izquierda a derecha</b>. Anoten la posición y la etiqueta de cada botón presionado.</p>
  <div class="rule-grid">${stages.map((list, i) => `<div class="rule-card"><h4>Etapa ${i + 1}</h4><ul>${list.map((r) => `<li>${r}</li>`).join('')}</ul></div>`).join('')}</div>`;
}

function sectionMorse() {
  const letters = [...new Set(MORSE_WORDS.flatMap(([w]) => [...w]))].sort();
  const code = (c) => [...MORSE_CODE[c]].map((s) => `<i class="${s === '.' ? 'dot' : 'dash'}"></i>`).join('');
  return `
  ${fig('morse', 'Código Morse')}
  <p>La luz parpadea una palabra en código Morse, en bucle. Un destello <b>corto</b> es un punto, uno <b>largo</b> una raya. Entre letras hay una pausa breve y, al terminar la palabra, una pausa larga.</p>
  <p>Identifica la palabra, ajusta la frecuencia con las flechas y presiona <b>TX</b>.</p>
  <div class="rule-grid two">
    <div class="rule-card"><h4>Alfabeto</h4><div class="morse-alpha">${letters.map((l) => `<div><b>${l}</b><span class="morse">${code(l)}</span></div>`).join('')}</div></div>
    <div class="rule-card"><h4>Palabra → frecuencia</h4><table class="tbl compact"><tbody>${MORSE_WORDS.map(([w, f]) => `<tr><td class="mono">${w}</td><td class="mono">${f} MHz</td></tr>`).join('')}</tbody></table></div>
  </div>`;
}

function sectionComplicated() {
  const labels = { C: 'Cortar', D: 'No cortar', S: 'Cortar si el último dígito del serial es <b>par</b>', P: 'Cortar si hay un puerto <b>paralelo</b>', B: 'Cortar si hay <b>2 o más baterías</b>' };
  const yes = '<span class="chk">●</span>';
  return `
  ${fig('complicated', 'Cables complicados')}
  <p>Revisa cada cable de forma individual. Sobre cada uno hay un LED y debajo una etiqueta que puede tener una estrella. Un cable puede tener rayas de dos colores: cuenta como <b>rojo</b> si tiene algo de rojo y como <b>azul</b> si tiene algo de azul.</p>
  <table class="tbl venn"><thead><tr><th>Rojo</th><th>Azul</th><th>★</th><th>LED</th><th>Qué hacer</th></tr></thead><tbody>
  ${Object.entries(COMPLICATED_RULES).map(([k, v]) => `<tr><td>${k.includes('R') ? yes : ''}</td><td>${k.includes('B') ? yes : ''}</td><td>${k.includes('S') ? yes : ''}</td><td>${k.includes('L') ? yes : ''}</td><td class="act-${v}"><b class="letter">${v}</b> ${labels[v]}</td></tr>`).join('')}
  </tbody></table>`;
}

function sectionSequence() {
  return `
  ${fig('sequence', 'Secuencia de cables')}
  <p>El módulo tiene <b>cuatro paneles</b>. Cada cable va de un número (1-3) a una letra (A-C). Lleva la cuenta de cuántos cables de cada color han aparecido <b>en todos los paneles</b>, incluido el actual.</p>
  <p>Corta el cable si su letra de destino aparece en la fila de su aparición. Cuando termines con el panel, baja con <b>▼</b>. Si dejas sin cortar un cable que debía cortarse, es un strike.</p>
  <div class="rule-grid three">${Object.entries(SEQUENCE_TABLE).map(([c, rows]) => `
    <div class="rule-card"><h4>${DOT(c)} Cables ${COLOR_NAMES[c].toLowerCase()}s</h4>
      <table class="tbl compact"><thead><tr><th>Aparición</th><th>Cortar si va a</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}ª</td><td class="mono">${r.split('').join(' o ')}</td></tr>`).join('')}</tbody></table></div>`).join('')}
  </div>`;
}

function mazeSvg({ open, circles }) {
  const c = 30, pad = 6, size = c * MAZE_SIZE + pad * 2;
  let walls = '';
  for (let i = 0; i < MAZE_SIZE * MAZE_SIZE; i++) {
    const x = pad + (i % MAZE_SIZE) * c, y = pad + Math.floor(i / MAZE_SIZE) * c;
    if (!(open[i] & N)) walls += `M${x} ${y}h${c}`;
    if (!(open[i] & W)) walls += `M${x} ${y}v${c}`;
    if (!(open[i] & S) && Math.floor(i / MAZE_SIZE) === MAZE_SIZE - 1) walls += `M${x} ${y + c}h${c}`;
    if (!(open[i] & E) && i % MAZE_SIZE === MAZE_SIZE - 1) walls += `M${x + c} ${y}v${c}`;
  }
  const dots = Array.from({ length: 36 }, (_, i) => `<circle cx="${pad + (i % 6) * c + c / 2}" cy="${pad + Math.floor(i / 6) * c + c / 2}" r="2" class="mz-dot"/>`).join('');
  const rings = circles.map((i) => `<circle cx="${pad + (i % 6) * c + c / 2}" cy="${pad + Math.floor(i / 6) * c + c / 2}" r="10" class="mz-ring"/>`).join('');
  return `<svg viewBox="0 0 ${size} ${size}" class="maze" role="img" aria-label="Laberinto">${dots}${rings}<path d="${walls}" class="mz-wall"/></svg>`;
}

function sectionMaze() {
  return `
  ${fig('maze', 'Laberinto')}
  <p>El desactivador ve una cuadrícula de 6×6 <b>sin paredes</b>, dos <b>círculos verdes</b>, una <b>luz blanca</b> (su posición) y un <b>triángulo rojo</b> (la meta). Usa los círculos para encontrar el laberinto correcto y guíalo con las flechas. Chocar contra una pared es un strike.</p>
  <p class="small muted">Las coordenadas se pueden dar como columna (1-6, de izquierda a derecha) y fila (1-6, de arriba hacia abajo).</p>
  <div class="mazes">${MAZES.map((m, i) => `<figure>${mazeSvg(m)}<figcaption>Laberinto ${i + 1}</figcaption></figure>`).join('')}</div>`;
}

function sectionPassword() {
  return `
  ${fig('password', 'Contraseña')}
  <p>Cada una de las cinco columnas tiene seis letras posibles. Solo una combinación forma una palabra de esta lista. Pide al desactivador las letras de las primeras columnas para descartar palabras, luego que la forme y presione <b>ENVIAR</b>.</p>
  <div class="words">${PASSWORDS.map((w) => `<span>${w}</span>`).join('')}</div>`;
}

function sectionVent() {
  return `
  ${fig('vent', 'Ventilar gas')}
  <p>Responde la pregunta de la pantalla antes de que la cuenta llegue a cero.</p>
  <ul>
    <li>«¿VENTILAR GAS?» → responde <b>SÍ</b>.</li>
    <li>«¿DETONAR?» → responde <b>NO</b>. Responder «SÍ» es un strike.</li>
  </ul>`;
}

function sectionCapacitor() {
  return `
  ${fig('capacitor', 'Descarga de capacitor')}
  <p>Una vez activo, el capacitor se carga sin parar. Mantén presionada la <b>palanca</b> para descargarlo: el contador sube mientras se mantiene. Si la carga llega al máximo (el contador llega a cero), es un strike.</p>`;
}

function sectionKnob() {
  const leds = (bits) => `<span class="leds">${[...bits].map((b, i) => `${i === 3 ? '<em></em>' : ''}<i class="${b === '1' ? 'on' : ''}"></i>`).join('')}</span>`;
  return `
  ${fig('knob', 'Perilla')}
  <p>La perilla puede girarse a cuatro posiciones. Cuando el módulo se activa, se encienden algunos de los 12 LEDs. Antes de que la cuenta llegue a cero, gira la perilla a la posición que indica el patrón. La posición es <b>relativa a la etiqueta «ARRIBA»</b> del módulo.</p>
  <div class="knob-grid">${KNOB_PATTERNS.map((p) => `
    <div class="knob-cell"><div class="knob-leds">${leds(p.top)}${leds(p.bottom)}</div><b>${KNOB_DIR_NAMES[p.dir]}</b></div>`).join('')}
  </div>`;
}

function sectionAppendix() {
  return `
  <h3 id="ap-a">Apéndice A — Indicadores</h3>
  <p>Placas negras con una etiqueta de tres letras y una luz que puede estar <b>encendida</b> o <b>apagada</b>. Etiquetas posibles:</p>
  <div class="words">${INDICATOR_LABELS.map((l) => `<span>${l}</span>`).join('')}</div>
  <h3 id="ap-b">Apéndice B — Baterías</h3>
  <p>Cuenta las <b>baterías</b>, no los soportes. Un soporte puede tener <b>una batería grande (D)</b> o <b>dos baterías pequeñas (AA)</b>.</p>
  <h3 id="ap-c">Apéndice C — Puertos</h3>
  <p>Los puertos vienen en placas. Una placa puede estar vacía.</p>
  <div class="ports">${Object.entries(PORTS).map(([id, name]) => `<figure data-port="${id}"><div class="port-img"></div><figcaption>${name}</figcaption></figure>`).join('')}</div>
  <h3 id="ap-d">Apéndice D — Número de serie</h3>
  <p>Etiqueta blanca con franja roja y seis caracteres. El último siempre es un dígito. Las vocales posibles son A, E, I y U (nunca aparecen la O ni la Y).</p>`;
}

const SECTIONS = [
  { id: 'intro', title: 'Cómo desactivar', group: 'Introducción', body: sectionIntro },
  { id: 'wires', title: 'Cables', group: 'Módulos', body: sectionWires },
  { id: 'button', title: 'El botón', group: 'Módulos', body: sectionButton },
  { id: 'keypad', title: 'Teclado', group: 'Módulos', body: sectionKeypad },
  { id: 'simon', title: 'Simón dice', group: 'Módulos', body: sectionSimon },
  { id: 'who', title: '¿Quién va primero?', group: 'Módulos', body: sectionWho },
  { id: 'memory', title: 'Memoria', group: 'Módulos', body: sectionMemory },
  { id: 'morse', title: 'Código Morse', group: 'Módulos', body: sectionMorse },
  { id: 'complicated', title: 'Cables complicados', group: 'Módulos', body: sectionComplicated },
  { id: 'sequence', title: 'Secuencia de cables', group: 'Módulos', body: sectionSequence },
  { id: 'maze', title: 'Laberintos', group: 'Módulos', body: sectionMaze },
  { id: 'password', title: 'Contraseñas', group: 'Módulos', body: sectionPassword },
  { id: 'vent', title: 'Ventilar gas', group: 'De necesidad', body: sectionVent },
  { id: 'capacitor', title: 'Descarga de capacitor', group: 'De necesidad', body: sectionCapacitor },
  { id: 'knob', title: 'Perilla', group: 'De necesidad', body: sectionKnob },
  { id: 'apendice', title: 'Apéndices', group: 'Referencia', body: sectionAppendix },
];

export function mountManual(container, { embedded = false } = {}) {
  const stored = localStorage.getItem(THEME_KEY);
  const groups = [...new Set(SECTIONS.map((s) => s.group))];
  container.innerHTML = `
  <div class="manual ${embedded ? 'embedded' : ''}" data-theme="${stored || ''}">
    <aside class="m-side" aria-label="Índice del manual">
      <div class="m-side-head">
        <input class="m-search" type="search" placeholder="Buscar sección…" aria-label="Buscar sección" />
        <button class="m-theme" aria-label="Cambiar tema" title="Cambiar tema">◐</button>
      </div>
      <nav>${groups.map((g) => `<p class="m-group">${g}</p>${SECTIONS.filter((s) => s.group === g).map((s, i) =>
        `<a href="#sec-${s.id}" data-sec="${s.id}"><span>${String(SECTIONS.indexOf(s)).padStart(2, '0')}</span>${s.title}</a>`).join('')}`).join('')}</nav>
    </aside>
    <button class="m-toc-btn" aria-label="Abrir índice">☰ Índice</button>
    <main class="m-pages">
      <header class="m-cover">
        <p class="m-stamp">Confidencial</p>
        <h1>Manual de desactivación de bombas</h1>
        <p>CommuniBomb · Revisión 1 · Para uso exclusivo de expertos</p>
      </header>
      ${SECTIONS.map((s, i) => `
      <section class="m-page" id="sec-${s.id}">
        <header class="m-page-head"><span class="m-kicker">${s.group}${s.group === 'Módulos' || s.group === 'De necesidad' ? ' · Sección ' + i : ''}</span><h2>${s.title}</h2></header>
        ${s.body()}
        <footer class="m-folio">Página ${i + 1} de ${SECTIONS.length}</footer>
      </section>`).join('')}
    </main>
  </div>`;

  const root = container.querySelector('.manual');
  const side = root.querySelector('.m-side');
  const scroller = root.querySelector('.m-pages');

  root.querySelector('.m-theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, root.dataset.theme);
  });
  root.querySelector('.m-toc-btn').addEventListener('click', () => side.classList.toggle('open'));
  root.querySelector('.m-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    side.querySelectorAll('a').forEach((a) => {
      a.hidden = q && !a.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q);
    });
  });
  root.querySelector('.m-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') side.querySelector('a:not([hidden])')?.click();
  });
  // Navegación interna sin tocar el hash de la app.
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#manual') return;
    e.preventDefault();
    root.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    side.classList.remove('open');
  });

  // Marca la sección visible en el índice.
  const links = new Map([...side.querySelectorAll('a[data-sec]')].map((a) => [`sec-${a.dataset.sec}`, a]));
  const pages = [...root.querySelectorAll('.m-page')];
  let ticking = false;
  const markActive = () => {
    ticking = false;
    const line = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.3;
    let current = null;
    for (const p of pages) if (p.getBoundingClientRect().top <= line) current = p;
    links.forEach((a, id) => a.classList.toggle('active', id === current?.id));
  };
  scroller.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(markActive); }
  }, { passive: true });
  markActive();

  // Vistas previas (tras cargar las fuentes para que se dibujen bien).
  document.fonts.ready.then(() => {
    root.querySelectorAll('[data-preview]').forEach((f) => {
      const type = f.dataset.preview;
      const src = type === 'timer'
        ? renderPreview(timerFace, { display: '04:12', strikes: 1, strikesMax: 3 })
        : renderPreview(FACES[type], previewView(type));
      f.querySelector('.mod-img').innerHTML = `<img src="${src}" alt="${esc(f.querySelector('figcaption').textContent)}" width="256" height="256" />`;
    });
    root.querySelectorAll('[data-port]').forEach((f) => {
      f.querySelector('.port-img').innerHTML = `<img src="${portImage(f.dataset.port)}" alt="" width="160" height="70" />`;
    });
  });
  return root;
}

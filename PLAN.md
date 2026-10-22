# CommuniBomb — Plan de desarrollo

Juego web cooperativo inspirado en *Keep Talking and Nobody Explodes*.
Un **desactivador** ve la bomba 3D; los **expertos** solo ven el manual. Se comunican por voz (Discord / en persona).

## Decisiones tomadas
| Tema | Decisión |
|---|---|
| Roles | 1 desactivador + N expertos (solo manual). Sin chat de texto. |
| Red | Node 22 + Express + Socket.IO. Servidor **autoritativo** (genera la bomba y valida cada acción). |
| Cliente | Vite + JS vanilla (ES modules) + Three.js para la bomba. |
| Visual | Bomba 3D girable, módulos con caras dibujadas en `CanvasTexture` (hit-test por UV), LEDs 3D con bloom, sonido sintetizado con Web Audio (sin assets externos). |
| Alcance | Juego completo: 11 módulos regulares + 3 de necesidad + widgets + dificultades + manual. |
| Idioma | Todo en español (incluidas las tablas de palabras de los módulos). |

## Arquitectura
```
CommuniBomb/
├─ package.json            # scripts: dev (server + vite), build, start
├─ server/
│  ├─ index.js             # Express + Socket.IO, sirve client/dist en producción
│  ├─ rooms.js             # salas, códigos de 4 letras, roles, host, reconexión
│  └─ game.js              # bucle de partida: temporizador, strikes, needy, fin
├─ shared/                 # lógica pura, usada por servidor (y manual)
│  ├─ rng.js               # PRNG con semilla
│  ├─ bomb.js              # generación de bomba: serial, baterías, indicadores, puertos
│  ├─ missions.js          # dificultades / misiones
│  └─ modules/*.js         # cada módulo: create(), view(), handle(), (tick() en needy)
└─ client/
   ├─ index.html
   ├─ src/
   │  ├─ main.js           # router de pantallas (inicio, sala, juego, manual, resultados)
   │  ├─ net.js            # cliente Socket.IO
   │  ├─ ui/               # lobby, sala, resultados (HTML/CSS)
   │  ├─ bomb3d/           # escena Three.js, cámara, raycast, widgets 3D
   │  ├─ faces/*.js        # dibujo en canvas + regiones clicables por módulo
   │  ├─ audio.js          # sonidos sintetizados
   │  └─ manual/           # manual de desactivación (páginas + diagramas SVG)
   └─ styles/
```

### Contrato de un módulo (shared)
- `create(rng, bomb)` → estado (con `secret` que nunca se envía al cliente).
- `view(state)` → lo que el desactivador ve.
- `handle(state, action, ctx)` → `{ result: 'strike' | 'solve' | null }` (ctx = bomba, tiempo restante, strikes, módulos resueltos).
- Needy: `tick(state, dt, ctx)` → puede devolver strike al expirar.

### Red (eventos)
`room:create`, `room:join {code,name}`, `room:setRole`, `room:settings`, `game:start`,
`game:action {moduleId, action}`, `game:state` (solo desactivador), `game:status` (todos: estado sala), `game:end {result, cause, time}`.
El temporizador lo lleva el servidor; los clientes interpolan. Los strikes aceleran el reloj (×1.25, ×1.5).
El botón (soltar con dígito X) envía el tiempo mostrado y el servidor lo valida con tolerancia.

## Módulos
**Regulares:** Cables · Botón · Teclado de símbolos · Simón dice · ¿Quién va primero? (palabras en español, homófonos: SÍ/SI, HAY/AY/AHÍ, VALLA/VAYA/BAYA…) · Memoria · Código Morse · Cables complicados · Secuencia de cables · Laberinto · Contraseña.
**De necesidad:** Perilla · Ventilar gas · Descarga de capacitor.
**Widgets:** número de serie, baterías AA/D, indicadores encendidos/apagados (FRK, CAR, BOB…), placas de puertos (DVI-D, Paralelo, PS/2, RJ-45, Serie, RCA estéreo).

Las reglas siguen la mecánica del original; las tablas de datos (palabras, laberintos, frecuencias morse) se crean propias en español.

## Partida
- Dificultades: **Entrenamiento** (3 módulos, 5:00) · **Normal** (5, 5:00) · **Difícil** (7 + 1 necesidad, 5:00) · **Experto** (9 + 2 necesidad, 6:00; la carcasa tiene 12 huecos y uno es el temporizador) · **Personalizada** (módulos, tiempo, strikes, tipos de módulo).
- 3 strikes = explosión (configurable; “hardcore” = 1).
- Fin: todos los regulares resueltos → desactivada. Tiempo 0 o strikes máximos → explota (pantalla blanca + resumen con causa y módulo).

## Visual / UX
- **Dirección estética:** consola industrial de desactivación — carbón y verde oliva, franjas de peligro amarillo/negro, tipografía stencil para títulos (*Saira Stencil One*), mono para datos (*JetBrains Mono*), display de 7 segmentos rojo para el temporizador.
- **Manual:** estética de carpeta de papel mecanografiado (*Special Elite* + *IBM Plex Serif*), índice lateral (cajón en móvil), modo oscuro opcional para jugar de noche.
- **Escena 3D:** mesa en penumbra, lámpara cálida, sombras, bloom en LEDs y display. Arrastrar = girar bomba; clic en módulo = acercar; clic derecho/Esc = alejar; Espacio = voltear.
- Mobile-first en lobby y manual (los expertos suelen usar el celular). La bomba admite táctil.
- `prefers-reduced-motion` respetado en la interfaz HTML.

## Fases
1. **Base:** package.json, servidor Express/Socket.IO, salas con código, lobby y sala (roles, ajustes, inicio). ✔ jugable en red sin bomba.
2. **Lógica compartida:** RNG, generación de bomba, los 14 módulos con `handle`, bucle de partida en servidor. Tests rápidos en Node para las reglas.
3. **Bomba 3D:** escena, carcasa, temporizador, widgets, slots, cámara/raycast, caras en canvas de cada módulo, sonidos.
4. **Manual:** todas las páginas con diagramas SVG generados desde los mismos datos (laberintos, símbolos).
5. **Cierre:** pantallas de resultados, reconexión, pulido visual, README con cómo jugar y desplegar.

## Cómo se correrá
```
npm install
npm run dev      # servidor :3000 + Vite :5173
npm run build && npm start   # producción en :3000
```
Para jugar con amigos fuera de tu red: desplegar en Render/Railway/Fly (o un túnel tipo ngrok/cloudflared).

## Estado
Fases 1–5 completadas. Extras agregados durante el desarrollo:
- **Práctica individual** sin conexión (la clase `Game` se movió a `shared/` y corre también en el navegador).
- Las caras de los módulos del manual se dibujan con el mismo código que la bomba.
- Pruebas: `tests/modules.test.js` (reglas, 300 bombas aleatorias resueltas) y `tests/network.test.js` (flujo de sala completo por Socket.IO).

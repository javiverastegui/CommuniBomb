# CommuniBomb

Juego web cooperativo de desactivación de bombas, inspirado en *Keep Talking and Nobody Explodes*.
Un jugador (el **desactivador**) ve la bomba en 3D; los demás (los **expertos**) solo ven el manual.
Se comunican hablando (Discord, Meet o en persona).

## Requisitos
- Node.js 18 o superior.

## Jugar en local
```bash
npm install
npm run build
npm start            # http://localhost:3000
```
Otros dispositivos de tu red Wi-Fi pueden entrar con `http://<IP-de-tu-PC>:3000`.

## Desarrollo
```bash
npm run dev          # servidor :3000 + Vite con recarga en caliente :5173
npm test             # reglas de los módulos + flujo de red completo
```

## Cómo se juega
1. Alguien crea una sala y comparte el código de 4 letras (o el enlace).
2. El anfitrión elige quién desactiva y la misión: Entrenamiento, Normal, Difícil, Experto o Personalizada.
3. El desactivador gira la bomba (arrastrar), se acerca a un módulo (clic) y se aleja (clic derecho o `Esc`). Con `Espacio` voltea la bomba.
4. Los expertos leen el manual y dan las instrucciones. Cada error es un strike y acelera el reloj.

También hay una **práctica individual** sin conexión (desde la portada) y el manual está disponible en `/#manual`.

## Contenido
- **11 módulos:** Cables, El botón, Teclado, Simón dice, ¿Quién va primero?, Memoria, Código Morse, Cables complicados, Secuencia de cables, Laberinto y Contraseña.
- **3 de necesidad:** Ventilar gas, Descarga de capacitor y Perilla.
- **Widgets:** número de serie, baterías AA/D, indicadores y placas de puertos.

## Arquitectura
| Carpeta | Contenido |
|---|---|
| `shared/` | Lógica pura: generación de bombas, reglas de cada módulo y `Game` (reloj, strikes, módulos de necesidad). La usan el servidor, la práctica sin conexión y el manual. |
| `server/` | Express + Socket.IO. Salas con código, roles, reconexión. El servidor es autoritativo: el estado secreto de los módulos nunca sale de él. |
| `client/src/bomb3d/` | Escena Three.js: carcasa, widgets, cámara, *raycasting* y *bloom*. |
| `client/src/faces/` | Cara de cada módulo dibujada en canvas, con sus zonas clicables. |
| `client/src/manual/` | Manual generado con los mismos datos que usa el juego. |
| `client/src/audio.js` | Todos los sonidos se sintetizan con Web Audio. |

## Desplegar en internet
Cualquier hosting de Node con WebSockets sirve (Render, Railway, Fly.io):
- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- El puerto se toma de la variable `PORT`.

Para jugar desde tu PC sin desplegar, puedes abrir un túnel, por ejemplo con `cloudflared tunnel --url http://localhost:3000`.

---
Juego de fans no oficial. No está afiliado con Steel Crate Games.

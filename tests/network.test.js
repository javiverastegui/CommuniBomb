import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const PORT = 3999;
const URL = `http://localhost:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => String(d).includes('escuchando') && resolve());
    server.on('exit', reject);
  });
});
after(() => server.kill());

const connect = () => new Promise((resolve) => {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.on('connect', () => resolve(s));
});
const ask = (s, ev, payload) => new Promise((resolve) => s.emit(ev, payload, resolve));
const next = (s, ev, pred = () => true) => new Promise((resolve) => {
  const h = (data) => { if (pred(data)) { s.off(ev, h); resolve(data); } };
  s.on(ev, h);
});

test('flujo completo de sala y partida', async () => {
  const host = await connect();
  const guest = await connect();

  const created = await ask(host, 'room:create', { name: 'Halcón', clientId: 'host-0000001' });
  assert.equal(created.ok, true);
  assert.match(created.code, /^[A-Z]{4}$/);

  const bad = await ask(guest, 'room:join', { code: 'ZZZZ', name: 'Lince', clientId: 'guest-000001' });
  assert.equal(bad.ok, false);

  const joinedUpdate = next(host, 'room:update', (r) => r.players.length === 2);
  const joined = await ask(guest, 'room:join', { code: created.code.toLowerCase(), name: 'Lince', clientId: 'guest-000001' });
  assert.equal(joined.ok, true);
  const room = await joinedUpdate;
  assert.equal(room.players.find((p) => p.id === 'host-0000001').role, 'defuser');
  assert.equal(room.players.find((p) => p.id === 'guest-000001').role, 'expert');

  // Solo el anfitrión puede iniciar
  const denied = await ask(guest, 'game:start');
  assert.equal(denied.ok, false);

  host.emit('room:settings', { difficulty: 'custom', custom: { time: 120, modules: 1, needy: 0, strikes: 1, pool: ['password'] } });
  await next(host, 'room:update', (r) => r.settings.difficulty === 'custom' && r.settings.custom.modules === 1);

  const firstState = next(host, 'game:state');
  const expertGotState = { value: false };
  guest.on('game:state', () => (expertGotState.value = true));
  const started = await ask(host, 'game:start');
  assert.equal(started.ok, true);
  const state = await firstState;
  assert.equal(state.modules.length, 1);
  assert.equal(state.modules[0].type, 'password');
  assert.equal(state.modules[0].view.secret, undefined, 'el secreto no debe salir del servidor');

  // El experto no puede actuar sobre la bomba
  guest.emit('game:action', { moduleId: 0, action: { type: 'submit' } });

  // Enviar la combinación inicial: casi siempre es incorrecta (strike → explota con 1 strike máximo),
  // y si por azar es la correcta, la bomba queda desactivada. En ambos casos la partida termina.
  const ends = Promise.all([next(host, 'game:end'), next(guest, 'game:end')]);
  const view = state.modules[0].view;
  host.emit('game:action', { moduleId: 0, action: { type: 'submit' } });
  const [endHost, endGuest] = await ends;
  assert.deepEqual(endHost, endGuest);
  assert.ok(['strikes', 'defused'].includes(endHost.cause));
  assert.equal(expertGotState.value, false, 'el experto nunca recibe el estado de la bomba');
  assert.ok(view.cols.length === 5);

  const backToLobby = next(guest, 'room:update', (r) => r.phase === 'lobby');
  host.emit('room:lobby');
  await backToLobby;

  // Reconexión con el mismo clientId conserva el rol
  guest.disconnect();
  const again = await connect();
  const rejoin = await ask(again, 'room:join', { code: created.code, clientId: 'guest-000001' });
  assert.equal(rejoin.ok, true);

  host.disconnect();
  again.disconnect();
});

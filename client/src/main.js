import './styles/main.css';
import './styles/manual.css';
import { socket, identity, request, send } from './net.js';
import { HomeScreen } from './ui/home.js';
import { RoomScreen } from './ui/room.js';
import { ResultsScreen } from './ui/results.js';
import { DefuserScreen } from './ui/defuser.js';
import { ExpertScreen, ManualScreen } from './ui/expert.js';
import { toast } from './ui/dom.js';
import { Game } from '@shared/game.js';
import { resolveMission, sanitizeSettings } from '@shared/missions.js';

const root = document.getElementById('app');
let current = null; // { key, screen }
let room = null;
let practice = null; // { difficulty, game, phase, result }
let deferred = null;

function mount(key, factory) {
  if (current?.key === key) return current.screen;
  current?.screen.destroy?.();
  root.innerHTML = '';
  const screen = factory();
  root.appendChild(screen.el);
  current = { key, screen };
  window.scrollTo(0, 0);
  return screen;
}

function setUrl(code) {
  const url = code ? `/?sala=${code}` : '/';
  if (location.pathname + location.search !== url) history.replaceState(null, '', url + location.hash);
}

const app = {
  identity,
  request,
  send,
  leave() {
    send('room:leave');
    identity.room = null;
    room = null;
    setUrl(null);
    render();
  },
  startPractice,
};

function startPractice(difficulty) {
  practice?.game?.stop();
  const mission = resolveMission(sanitizeSettings({ difficulty }));
  practice = { difficulty, phase: 'playing', result: null };
  const screen = mount(`practice-${Date.now()}`, () => new DefuserScreen({
    label: 'Práctica',
    onAction: (id, action) => practice?.game?.action(id, action),
  }));
  practice.game = new Game(mission, {
    onState: (s) => screen.onState(s),
    onFx: (fx) => screen.onFx(fx),
    onEnd: (r) => {
      screen.onEnd(r);
      practice.phase = 'results';
      practice.result = r;
      render();
    },
  });
  practice.game.start();
}

function render() {
  clearTimeout(deferred);
  // Deja terminar la animación de explosión/desactivación antes de cambiar de pantalla.
  const busy = current?.screen.busyUntil - performance.now();
  if (busy > 0) {
    deferred = setTimeout(render, busy + 20);
    return;
  }

  if (location.hash === '#manual') return mount('manual', () => new ManualScreen());

  if (practice) {
    if (practice.phase !== 'results') return;
    const exit = () => { practice = null; render(); };
    mount('practice-results', () => new ResultsScreen({
      again: () => startPractice(practice.difficulty),
      lobby: exit,
      lobbyLabel: 'Volver al inicio',
      leave: exit,
    })).update({ result: practice.result, canControl: true });
    return;
  }

  if (!room) return mount('home', () => new HomeScreen(app));

  const me = room.players.find((p) => p.id === identity.id);
  const host = room.players.find((p) => p.id === room.hostId);
  if (room.phase === 'playing') {
    if (me?.role === 'defuser') {
      mount('defuser', () => new DefuserScreen({
        label: `Sala ${room.code}`,
        onAction: (moduleId, action) => send('game:action', { moduleId, action }),
      }));
    } else mount('expert', () => new ExpertScreen(app)).update(room);
  } else if (room.phase === 'results') {
    mount('results', () => new ResultsScreen({
      again: async () => {
        const res = await request('game:start');
        if (!res.ok) toast(res.error || 'No se pudo iniciar.');
      },
      lobby: () => send('room:lobby'),
      leave: () => app.leave(),
    })).update({ result: room.result, canControl: room.hostId === identity.id, waitingFor: host?.name });
  } else mount('room', () => new RoomScreen(app)).update(room);
}

socket.on('connect', async () => {
  if (!identity.room) return;
  const res = await request('room:join', { code: identity.room, name: identity.name, clientId: identity.id });
  if (!res.ok) {
    identity.room = null;
    room = null;
    setUrl(null);
    toast('La sala ya no existe.');
    render();
  }
});
socket.on('disconnect', () => room && toast('Conexión perdida. Reconectando…'));
socket.on('room:update', (r) => {
  room = r;
  identity.room = r.code;
  setUrl(r.code);
  render();
});
socket.on('game:state', (s) => current?.key === 'defuser' && current.screen.onState(s));
socket.on('game:fx', (fx) => current?.key === 'defuser' && current.screen.onFx(fx));
socket.on('game:end', (r) => current?.key === 'defuser' && current.screen.onEnd(r));
window.addEventListener('hashchange', render);

render();

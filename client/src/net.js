import { io } from 'socket.io-client';

const ID_KEY = 'cb.clientId';
const NAME_KEY = 'cb.name';
const ROOM_KEY = 'cb.room';

function makeId() {
  return (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
}

// Un id por pestaña: así se puede probar con varias pestañas en el mismo navegador.
const clientId = sessionStorage.getItem(ID_KEY) || makeId();
sessionStorage.setItem(ID_KEY, clientId);

export const socket = io({ transports: ['websocket', 'polling'] });

export const identity = {
  id: clientId,
  get name() { return localStorage.getItem(NAME_KEY) || ''; },
  set name(v) { localStorage.setItem(NAME_KEY, v); },
  get room() { return sessionStorage.getItem(ROOM_KEY); },
  set room(v) { v ? sessionStorage.setItem(ROOM_KEY, v) : sessionStorage.removeItem(ROOM_KEY); },
};

export function request(event, payload) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'El servidor no responde.' }), 6000);
    socket.emit(event, payload, (res) => {
      clearTimeout(timer);
      resolve(res || { ok: false });
    });
  });
}

export const send = (event, payload) => socket.emit(event, payload);

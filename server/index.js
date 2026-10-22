import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';

const PORT = Number(process.env.PORT) || 3000;
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, '..', 'client', 'dist');

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: true } });
const rooms = new RoomManager(io);

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.rooms.size }));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 16);
const cleanId = (id) => (typeof id === 'string' && /^[a-z0-9-]{8,64}$/i.test(id) ? id : null);
const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

io.on('connection', (socket) => {
  const current = () => {
    const room = rooms.get(socket.data.roomCode);
    return room && room.players.has(socket.data.playerId) ? room : null;
  };

  const leaveCurrent = () => {
    const room = current();
    if (!room) return;
    socket.leave(room.code);
    room.remove(socket.data.playerId);
    socket.data.roomCode = null;
  };

  const enter = (room, id, name) => {
    socket.data.playerId = id;
    socket.data.roomCode = room.code;
    room.join(id, name, socket);
  };

  socket.on('room:create', ({ name, clientId } = {}, ack) => {
    const id = cleanId(clientId);
    name = cleanName(name);
    if (!id || !name) return reply(ack, { ok: false, error: 'Escribe tu nombre.' });
    leaveCurrent();
    const room = rooms.create();
    enter(room, id, name);
    reply(ack, { ok: true, code: room.code });
  });

  socket.on('room:join', ({ code, name, clientId } = {}, ack) => {
    const id = cleanId(clientId);
    name = cleanName(name);
    const room = rooms.get(code);
    if (!id) return reply(ack, { ok: false, error: 'Identificador inválido.' });
    if (!room) return reply(ack, { ok: false, error: 'No existe una sala con ese código.' });
    const returning = room.players.has(id);
    if (!returning && !name) return reply(ack, { ok: false, error: 'Escribe tu nombre.' });
    if (!returning && room.isFull()) return reply(ack, { ok: false, error: 'La sala está llena (8 jugadores).' });
    if (socket.data.roomCode !== room.code) leaveCurrent();
    enter(room, id, name);
    reply(ack, { ok: true, code: room.code });
  });

  socket.on('room:leave', () => leaveCurrent());
  socket.on('room:role', ({ playerId, role } = {}) => current()?.setRole(socket.data.playerId, playerId, role));
  socket.on('room:settings', (settings) => current()?.setSettings(socket.data.playerId, settings));
  socket.on('room:lobby', () => current()?.backToLobby(socket.data.playerId));

  socket.on('game:start', (_payload, ack) => {
    const room = current();
    const error = room ? room.start(socket.data.playerId) : 'No estás en una sala.';
    reply(ack, { ok: !error, error });
  });

  socket.on('game:action', ({ moduleId, action } = {}) => {
    if (!Number.isInteger(moduleId) || !action || typeof action !== 'object') return;
    current()?.action(socket.data.playerId, moduleId, action);
  });

  socket.on('disconnect', () => current()?.disconnect(socket.data.playerId, socket.id));
});

server.listen(PORT, () => {
  console.log(`CommuniBomb escuchando en http://localhost:${PORT}`);
});

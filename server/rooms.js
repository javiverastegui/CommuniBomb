import { Game } from '../shared/game.js';
import { sanitizeSettings, resolveMission } from '../shared/missions.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O
const MAX_PLAYERS = 8;
const DISCONNECT_GRACE_MS = 90_000;

export class Room {
  constructor(code, io, onEmpty) {
    this.code = code;
    this.io = io;
    this.onEmpty = onEmpty;
    this.players = new Map(); // id -> { id, name, role, connected, socketId, leftAt }
    this.hostId = null;
    this.settings = sanitizeSettings({});
    this.phase = 'lobby'; // lobby | playing | results
    this.game = null;
    this.result = null;
    this.startedAt = null;
  }

  get defuser() {
    return [...this.players.values()].find((p) => p.role === 'defuser') || null;
  }

  isFull() {
    return this.players.size >= MAX_PLAYERS;
  }

  join(id, name, socket) {
    let p = this.players.get(id);
    if (!p) {
      p = { id, name, role: this.defuser ? 'expert' : 'defuser', connected: true };
      this.players.set(id, p);
    }
    p.name = name || p.name;
    p.connected = true;
    p.socketId = socket.id;
    p.leftAt = null;
    if (!this.hostId || !this.players.has(this.hostId)) this.hostId = id;
    socket.join(this.code);
    this.broadcast();
    if (this.phase === 'playing' && p.role === 'defuser') this.io.to(socket.id).emit('game:state', this.game.view());
  }

  disconnect(id, socketId) {
    const p = this.players.get(id);
    if (!p || p.socketId !== socketId) return; // ya se reconectó con otro socket
    p.connected = false;
    p.leftAt = Date.now();
    this.broadcast();
  }

  remove(id) {
    if (!this.players.delete(id)) return;
    if (this.hostId === id) {
      const next = [...this.players.values()].find((p) => p.connected) || [...this.players.values()][0];
      this.hostId = next ? next.id : null;
    }
    if (this.players.size === 0) {
      this.game?.stop();
      this.onEmpty(this);
      return;
    }
    this.broadcast();
  }

  sweep(now) {
    for (const p of [...this.players.values()]) {
      if (p.connected || now - p.leftAt < DISCONNECT_GRACE_MS) continue;
      // Durante la partida se le guarda el lugar al desactivador.
      if (this.phase === 'playing' && p.role === 'defuser') continue;
      this.remove(p.id);
    }
  }

  setRole(byId, targetId, role) {
    if (this.phase !== 'lobby' || !['defuser', 'expert'].includes(role)) return;
    if (byId !== this.hostId && byId !== targetId) return;
    const target = this.players.get(targetId);
    if (!target) return;
    if (role === 'defuser') for (const p of this.players.values()) if (p.role === 'defuser') p.role = 'expert';
    target.role = role;
    this.broadcast();
  }

  setSettings(byId, settings) {
    if (byId !== this.hostId || this.phase !== 'lobby') return;
    this.settings = sanitizeSettings(settings);
    this.broadcast();
  }

  start(byId) {
    if (byId !== this.hostId || this.phase === 'playing') return 'Solo el anfitrión puede iniciar.';
    const defuser = this.defuser;
    if (!defuser || !defuser.connected) return 'Falta un desactivador conectado.';
    const mission = resolveMission(this.settings);
    this.result = null;
    this.game = new Game(mission, {
      onState: (view) => this.toDefuser('game:state', view),
      onFx: (fx) => this.toDefuser('game:fx', fx),
      onEnd: (result) => {
        this.phase = 'results';
        this.result = result;
        this.game = null;
        this.io.to(this.code).emit('game:end', result);
        this.broadcast();
      },
    });
    this.phase = 'playing';
    this.startedAt = Date.now();
    this.broadcast();
    this.game.start();
    return null;
  }

  action(byId, moduleId, action) {
    if (this.phase !== 'playing' || this.defuser?.id !== byId) return;
    this.game.action(moduleId, action);
  }

  backToLobby(byId) {
    if (byId !== this.hostId) return;
    this.game?.stop();
    this.game = null;
    this.phase = 'lobby';
    this.broadcast();
  }

  toDefuser(event, payload) {
    const d = this.defuser;
    if (d?.connected) this.io.to(d.socketId).emit(event, payload);
  }

  publicState() {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      result: this.result,
      startedAt: this.startedAt,
      players: [...this.players.values()].map(({ id, name, role, connected }) => ({ id, name, role, connected })),
    };
  }

  broadcast() {
    this.io.to(this.code).emit('room:update', this.publicState());
  }
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    setInterval(() => {
      const now = Date.now();
      for (const r of [...this.rooms.values()]) r.sweep(now);
    }, 15_000).unref();
  }

  create() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, this.io, (r) => this.rooms.delete(r.code));
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').toUpperCase().trim());
  }
}

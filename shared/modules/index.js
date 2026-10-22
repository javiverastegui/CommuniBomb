import wires from './wires.js';
import button from './button.js';
import keypad from './keypad.js';
import simon from './simon.js';
import who from './who.js';
import memory from './memory.js';
import morse from './morse.js';
import complicated from './complicated.js';
import sequence from './sequence.js';
import maze from './maze.js';
import password from './password.js';
import knob from './knob.js';
import vent from './vent.js';
import capacitor from './capacitor.js';

export const MODULES = Object.fromEntries(
  [wires, button, keypad, simon, who, memory, morse, complicated, sequence, maze, password, knob, vent, capacitor]
    .map((m) => [m.type, m]),
);

export const REGULAR_TYPES = Object.values(MODULES).filter((m) => !m.needy).map((m) => m.type);
export const NEEDY_TYPES = Object.values(MODULES).filter((m) => m.needy).map((m) => m.type);

// Lo que el desactivador puede ver de un módulo: todo excepto `secret`.
export function publicView(state) {
  const { secret, ...view } = state;
  return view;
}

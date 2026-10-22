const pad = (n) => String(n).padStart(2, '0');

// Formato del temporizador: MM:SS con un minuto o más, SS.cc por debajo.
export function formatTimer(sec) {
  if (!(sec > 0)) return '00.00';
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${pad(Math.min(m, 99))}:${pad(s)}`;
  }
  const s = Math.floor(sec);
  const c = Math.floor((sec - s) * 100);
  return `${pad(s)}.${pad(c)}`;
}

// Velocidad del reloj según strikes.
export const timerRate = (strikes) => 1 + 0.25 * Math.min(strikes, 4);

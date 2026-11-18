/** Round-dot screen for process films. Angles are the usual set that keeps the colors from forming a moiré. */
export const HALFTONE_LPI = 45;

export const HALFTONE_ANGLE: Record<"c" | "m" | "y" | "k", number> = {
  c: 15,
  m: 75,
  y: 0,
  k: 45,
};

export function halftoneCell(dpi: number) {
  return Math.max(4, Math.round(dpi / HALFTONE_LPI));
}

export function halftoneLines(dpi: number) {
  return Math.max(1, Math.round(dpi / halftoneCell(dpi)));
}

export function screenDot(x: number, y: number, coverage: number, angleDeg: number, cell: number) {
  if (coverage <= 0.02) return false;
  if (coverage >= 0.98) return true;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xr = x * cos - y * sin;
  const yr = x * sin + y * cos;
  const half = cell / 2;
  let cx = xr % cell;
  let cy = yr % cell;
  if (cx < 0) cx += cell;
  if (cy < 0) cy += cell;
  cx -= half;
  cy -= half;
  const amount = coverage <= Math.PI / 4 ? coverage : 1 - coverage;
  const radius = cell * Math.sqrt(amount / Math.PI);
  const inside = Math.hypot(cx, cy) <= radius;
  return coverage <= Math.PI / 4 ? inside : !inside;
}

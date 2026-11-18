import type { Ink, RGB } from "@/lib/separator/types";

export function dist(a: RGB, b: RGB) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function luma(color: RGB) {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

export function hexOf(color: RGB) {
  const channel = (value: number) => value.toString(16).padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

export function parseHex(hex: string): RGB {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function colorName(color: RGB) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const delta = max - min;
  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));

  if (light < 0.14) return "negro";
  if (sat < 0.14) {
    if (light > 0.9) return "blanco";
    if (light > 0.72) return "gris-claro";
    if (light > 0.4) return "gris";
    return "gris-oscuro";
  }
  if (sat < 0.45 && light < 0.45 && r >= g && g >= b) return "marron";

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  if (hue < 15 || hue >= 345) return "rojo";
  if (hue < 42) return "naranja";
  if (hue < 70) return "amarillo";
  if (hue < 165) return "verde";
  if (hue < 200) return "cian";
  if (hue < 255) return "azul";
  if (hue < 295) return "morado";
  return "rosa";
}

export function slugifyColor(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function nameInks(colors: RGB[], counts: number[]): Pick<Ink, "name" | "slug" | "r" | "g" | "b" | "pixels">[] {
  const used = new Map<string, number>();
  return colors.map((color, index) => {
    const base = colorName(color);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const name = seen === 0 ? base : `${base}-${seen + 1}`;
    return {
      name,
      slug: slugifyColor(name),
      r: color.r,
      g: color.g,
      b: color.b,
      pixels: counts[index] ?? 0,
    };
  });
}

export function isBlackInk(ink: Pick<Ink, "name" | "r" | "g" | "b">) {
  return ink.name.startsWith("negro") || luma(ink) < 28;
}

export function sortInksForPrint<T extends Pick<Ink, "name" | "r" | "g" | "b">>(inks: T[]) {
  return [...inks].sort((a, b) => {
    const blackA = isBlackInk(a);
    const blackB = isBlackInk(b);
    if (blackA !== blackB) return blackA ? 1 : -1;
    return luma(b) - luma(a);
  });
}

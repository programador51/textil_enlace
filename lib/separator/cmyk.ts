import { BACKGROUND, type Ink, type PixelBuffer } from "@/lib/separator/types";

export type Cmyk = { c: number; m: number; y: number; k: number };

const MIN_COVERAGE = 0.08;

export const PROCESS_CHANNELS = [
  { name: "amarillo", slug: "amarillo", r: 255, g: 242, b: 0, key: "y" },
  { name: "magenta", slug: "magenta", r: 236, g: 0, b: 140, key: "m" },
  { name: "cian", slug: "cian", r: 0, g: 174, b: 239, key: "c" },
  { name: "negro", slug: "negro", r: 20, g: 20, b: 20, key: "k" },
] as const;

export function rgbToCmyk(r: number, g: number, b: number): Cmyk {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const k = 1 - Math.max(red, green, blue);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 1 };
  const scale = 1 - k;
  return {
    c: (1 - red - k) / scale,
    m: (1 - green - k) / scale,
    y: (1 - blue - k) / scale,
    k,
  };
}

export function processKey(slug: string) {
  return PROCESS_CHANNELS.find((channel) => channel.slug === slug)?.key ?? null;
}

export function orderProcessInks<T extends { slug: string }>(inks: T[]) {
  const rank = new Map<string, number>(PROCESS_CHANNELS.map((channel, index) => [channel.slug, index]));
  return [...inks].sort((a, b) => (rank.get(a.slug) ?? 9) - (rank.get(b.slug) ?? 9));
}

export function cmykInks(buffer: PixelBuffer, assignment: Uint16Array): Ink[] {
  const hits: Record<(typeof PROCESS_CHANNELS)[number]["key"], number> = { c: 0, m: 0, y: 0, k: 0 };
  const { data } = buffer;
  for (let index = 0; index < assignment.length; index += 1) {
    if (assignment[index] === BACKGROUND) continue;
    const offset = index * 4;
    const cmyk = rgbToCmyk(data[offset], data[offset + 1], data[offset + 2]);
    if (cmyk.c >= MIN_COVERAGE) hits.c += 1;
    if (cmyk.m >= MIN_COVERAGE) hits.m += 1;
    if (cmyk.y >= MIN_COVERAGE) hits.y += 1;
    if (cmyk.k >= MIN_COVERAGE) hits.k += 1;
  }

  const present = PROCESS_CHANNELS.filter((channel) => hits[channel.key] > 0);
  const chosen = present.length > 0 ? present : PROCESS_CHANNELS;
  return chosen.map((channel, index) => ({
    index,
    name: channel.name,
    slug: channel.slug,
    r: channel.r,
    g: channel.g,
    b: channel.b,
    pixels: hits[channel.key],
    fine: false,
  }));
}

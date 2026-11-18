import { orderProcessInks, PROCESS_CHANNELS, processKey, rgbToCmyk } from "@/lib/separator/cmyk";
import { HALFTONE_ANGLE, halftoneCell, screenDot } from "@/lib/separator/halftone";
import { sortInksForPrint } from "@/lib/separator/color";
import { BACKGROUND, type Ink, type PixelBuffer, type RGB } from "@/lib/separator/types";

const FABRIC: Record<"CLARA" | "OSCURA", RGB> = {
  CLARA: { r: 244, g: 241, b: 234 },
  OSCURA: { r: 28, g: 36, b: 48 },
};

export type Film = {
  fileName: string;
  name: string;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  blendMode?: "normal" | "multiply";
};

export function marginPx(dpi: number) {
  return Math.max(16, Math.round((8 * dpi) / 25.4));
}

export function chokePx(chokeMm: number, dpi: number) {
  if (chokeMm <= 0) return 0;
  return Math.max(1, Math.round((chokeMm * dpi) / 25.4));
}

export function erode(mask: Uint8Array, width: number, height: number, radius: number) {
  if (radius <= 0) return mask;
  const horizontal = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let keep = 1;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const row = y * width;
      for (let xx = x0; xx <= x1; xx += 1) {
        if (!mask[row + xx]) {
          keep = 0;
          break;
        }
      }
      horizontal[row + x] = keep;
    }
  }

  const out = new Uint8Array(mask.length);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let keep = 1;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      for (let yy = y0; yy <= y1; yy += 1) {
        if (!horizontal[yy * width + x]) {
          keep = 0;
          break;
        }
      }
      out[y * width + x] = keep;
    }
  }
  return out;
}

export function buildFilms(input: {
  assignment: Uint16Array;
  width: number;
  height: number;
  inks: Ink[];
  fabric: "CLARA" | "OSCURA";
  dpi: number;
  chokeMm: number;
  pixels?: Uint8ClampedArray;
  process?: "spot" | "cmyk";
}) {
  if (input.process === "cmyk") return buildCmykFilms(input);
  const ordered = sortInksForPrint(input.inks);
  const margin = marginPx(input.dpi);
  const filmW = input.width + margin * 2;
  const filmH = input.height + margin * 2;
  const base = input.fabric === "OSCURA" ? underbase(input.assignment, input.width, input.height, chokePx(input.chokeMm, input.dpi)) : null;
  const films: Film[] = [];

  if (base) {
    films.push(filmFromMask("01-base-blanca.png", "Base blanca", base, input.width, input.height, margin, { r: 255, g: 255, b: 255 }));
  }

  ordered.forEach((ink) => {
    const mask = new Uint8Array(input.width * input.height);
    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      if (input.assignment[pixel] === ink.index) mask[pixel] = 1;
    }
    const number = String(films.length + 1).padStart(2, "0");
    films.push(filmFromMask(`${number}-${ink.slug}.png`, ink.name, mask, input.width, input.height, margin, ink));
  });

  for (const item of films) stampRegistration(item.rgba, item.width, item.height, margin);
  return { films, width: filmW, height: filmH };
}

export function buildPreview(input: {
  assignment: Uint16Array;
  width: number;
  height: number;
  inks: Ink[];
  fabric: "CLARA" | "OSCURA";
  dpi: number;
  chokeMm: number;
  maxEdge?: number;
  pixels?: Uint8ClampedArray;
  process?: "spot" | "cmyk";
}): PixelBuffer {
  if (input.process === "cmyk" && input.pixels) return buildCmykPreview({ ...input, pixels: input.pixels });
  const maxEdge = input.maxEdge ?? 480;
  const scale = Math.min(1, maxEdge / Math.max(input.width, input.height));
  const width = Math.max(1, Math.round(input.width * scale));
  const height = Math.max(1, Math.round(input.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  const cloth = FABRIC[input.fabric];
  const base = input.fabric === "OSCURA" ? underbase(input.assignment, input.width, input.height, chokePx(input.chokeMm, input.dpi)) : null;
  const ordered = sortInksForPrint(input.inks);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(input.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(input.width - 1, Math.floor(x / scale));
      const source = sourceY * input.width + sourceX;
      let color = cloth;
      if (base?.[source]) color = { r: 247, g: 247, b: 245 };
      for (const ink of ordered) {
        if (input.assignment[source] === ink.index) color = ink;
      }
      const offset = (y * width + x) * 4;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = 255;
    }
  }

  return { width, height, data };
}

function buildCmykFilms(input: {
  assignment: Uint16Array;
  width: number;
  height: number;
  inks: Ink[];
  fabric: "CLARA" | "OSCURA";
  dpi: number;
  chokeMm: number;
  pixels?: Uint8ClampedArray;
}) {
  const pixels = input.pixels;
  if (!pixels) throw new Error("Faltan los píxeles para la cuatricromía.");
  const margin = marginPx(input.dpi);
  const filmW = input.width + margin * 2;
  const filmH = input.height + margin * 2;
  const base = input.fabric === "OSCURA" ? underbase(input.assignment, input.width, input.height, chokePx(input.chokeMm, input.dpi)) : null;
  const films: Film[] = [];

  if (base) {
    films.push(filmFromMask("01-base-blanca.png", "Base blanca", base, input.width, input.height, margin, { r: 255, g: 255, b: 255 }));
  }

  for (const ink of orderProcessInks(input.inks)) {
    const key = processKey(ink.slug);
    if (!key) continue;
    const number = String(films.length + 1).padStart(2, "0");
    films.push(
      filmFromCoverage(
        `${number}-${ink.slug}.png`,
        ink.name,
        pixels,
        input.assignment,
        key,
        input.width,
        input.height,
        margin,
        input.dpi,
      ),
    );
  }

  for (const item of films) stampRegistration(item.rgba, item.width, item.height, margin);
  return { films, width: filmW, height: filmH };
}

function buildCmykPreview(input: {
  assignment: Uint16Array;
  width: number;
  height: number;
  fabric: "CLARA" | "OSCURA";
  dpi: number;
  chokeMm: number;
  maxEdge?: number;
  pixels: Uint8ClampedArray;
}): PixelBuffer {
  const maxEdge = input.maxEdge ?? 480;
  const scale = Math.min(1, maxEdge / Math.max(input.width, input.height));
  const width = Math.max(1, Math.round(input.width * scale));
  const height = Math.max(1, Math.round(input.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  const cloth = FABRIC[input.fabric];
  const base = input.fabric === "OSCURA" ? underbase(input.assignment, input.width, input.height, chokePx(input.chokeMm, input.dpi)) : null;

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(input.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(input.width - 1, Math.floor(x / scale));
      const source = sourceY * input.width + sourceX;
      const offset = (y * width + x) * 4;
      if (input.assignment[source] === BACKGROUND) {
        data[offset] = cloth.r;
        data[offset + 1] = cloth.g;
        data[offset + 2] = cloth.b;
        data[offset + 3] = 255;
        continue;
      }
      const ground = base?.[source] ? { r: 247, g: 247, b: 245 } : cloth;
      const sample = source * 4;
      const cmyk = rgbToCmyk(input.pixels[sample], input.pixels[sample + 1], input.pixels[sample + 2]);
      data[offset] = Math.round(ground.r * (1 - cmyk.c) * (1 - cmyk.k));
      data[offset + 1] = Math.round(ground.g * (1 - cmyk.m) * (1 - cmyk.k));
      data[offset + 2] = Math.round(ground.b * (1 - cmyk.y) * (1 - cmyk.k));
      data[offset + 3] = 255;
    }
  }

  return { width, height, data };
}

function filmFromCoverage(
  fileName: string,
  name: string,
  pixels: Uint8ClampedArray,
  assignment: Uint16Array,
  key: "c" | "m" | "y" | "k",
  width: number,
  height: number,
  margin: number,
  dpi: number,
): Film {
  const filmW = width + margin * 2;
  const filmH = height + margin * 2;
  const rgba = new Uint8ClampedArray(filmW * filmH * 4);
  const cell = halftoneCell(dpi);
  const angle = HALFTONE_ANGLE[key];
  const ink = PROCESS_CHANNELS.find((channel) => channel.key === key);
  if (!ink) throw new Error("Falta el color de la cuatricromía.");
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = y * width + x;
      if (assignment[source] === BACKGROUND) continue;
      const offset = source * 4;
      const coverage = rgbToCmyk(pixels[offset], pixels[offset + 1], pixels[offset + 2])[key];
      if (!screenDot(x, y, coverage, angle, cell)) continue;
      const filmOffset = ((y + margin) * filmW + (x + margin)) * 4;
      rgba[filmOffset] = ink.r;
      rgba[filmOffset + 1] = ink.g;
      rgba[filmOffset + 2] = ink.b;
      rgba[filmOffset + 3] = 255;
    }
  }
  return { fileName, name, rgba, width: filmW, height: filmH, blendMode: "multiply" };
}

function underbase(assignment: Uint16Array, width: number, height: number, radius: number) {
  const mask = new Uint8Array(assignment.length);
  for (let index = 0; index < assignment.length; index += 1) {
    if (assignment[index] !== BACKGROUND) mask[index] = 1;
  }
  return erode(mask, width, height, radius);
}

function filmFromMask(
  fileName: string,
  name: string,
  mask: Uint8Array,
  width: number,
  height: number,
  margin: number,
  color: RGB,
): Film {
  const filmW = width + margin * 2;
  const filmH = height + margin * 2;
  const rgba = new Uint8ClampedArray(filmW * filmH * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      const offset = ((y + margin) * filmW + (x + margin)) * 4;
      rgba[offset] = color.r;
      rgba[offset + 1] = color.g;
      rgba[offset + 2] = color.b;
      rgba[offset + 3] = 255;
    }
  }
  return { fileName, name, rgba, width: filmW, height: filmH, blendMode: "normal" };
}

function stampRegistration(rgba: Uint8ClampedArray, width: number, height: number, margin: number) {
  const arm = Math.max(4, Math.round(margin * 0.28));
  const thick = Math.max(1, Math.round(arm / 6));
  const inset = Math.round(margin / 2);
  const points = [
    [inset, inset],
    [width - 1 - inset, inset],
    [inset, height - 1 - inset],
    [width - 1 - inset, height - 1 - inset],
  ];
  for (const [cx, cy] of points) stampCross(rgba, width, height, cx, cy, arm, thick);
}

function stampCross(rgba: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, arm: number, thick: number) {
  for (let y = cy - thick; y <= cy + thick; y += 1) {
    for (let x = cx - arm; x <= cx + arm; x += 1) paint(rgba, width, height, x, y);
  }
  for (let y = cy - arm; y <= cy + arm; y += 1) {
    for (let x = cx - thick; x <= cx + thick; x += 1) paint(rgba, width, height, x, y);
  }
}

function paint(rgba: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (y * width + x) * 4;
  rgba[offset] = 0;
  rgba[offset + 1] = 0;
  rgba[offset + 2] = 0;
  rgba[offset + 3] = 255;
}

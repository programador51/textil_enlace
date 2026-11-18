import { dist } from "@/lib/separator/color";
import { outputSize } from "@/lib/separator/fit";
import type { PixelBuffer, RGB } from "@/lib/separator/types";

const NAMED: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 220, g: 30, b: 30 },
  yellow: { r: 250, g: 210, b: 0 },
  blue: { r: 20, g: 80, b: 200 },
  green: { r: 20, g: 140, b: 60 },
  orange: { r: 240, g: 120, b: 20 },
  purple: { r: 120, g: 40, b: 170 },
  negro: { r: 0, g: 0, b: 0 },
  blanco: { r: 255, g: 255, b: 255 },
  rojo: { r: 220, g: 30, b: 30 },
  amarillo: { r: 250, g: 210, b: 0 },
  azul: { r: 20, g: 80, b: 200 },
  verde: { r: 20, g: 140, b: 60 },
};

export async function rasterizeFile(file: Blob, widthCm: number, heightCm: number, dpi: number) {
  const fitted = outputSize(widthCm, heightCm, dpi);
  const name = file instanceof File ? file.name : "logo";
  const kind = fileKind(file, name);
  if (kind === "pdf") return { ...(await rasterizePdf(file, fitted.width, fitted.height)), ...fitted };
  if (kind === "svg") return { ...(await rasterizeSvg(file, fitted.width, fitted.height)), ...fitted };
  return { ...(await rasterizeBitmap(file, fitted.width, fitted.height, null)), ...fitted };
}

async function rasterizeSvg(file: Blob, width: number, height: number) {
  const text = await file.text();
  const palette = svgPalette(text);
  return rasterizeBitmap(new Blob([text], { type: "image/svg+xml" }), width, height, palette);
}

async function rasterizeBitmap(file: Blob, width: number, height: number, palette: RGB[] | null) {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    return { buffer: drawContain(image, width, height), palette };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function rasterizePdf(file: Blob, width: number, height: number) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(width / base.width, height / base.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("El navegador no pudo preparar el lienzo.");
    const dx = (width - viewport.width) / 2;
    const dy = (height - viewport.height) / 2;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(dx, dy);
    await page.render({ canvasContext: context, viewport }).promise;
    context.restore();
    const image = context.getImageData(0, 0, width, height);
    return { buffer: { width, height, data: image.data }, palette: await pdfPalette(page) };
  } finally {
    await pdf.destroy();
  }
}

async function pdfPalette(page: {
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>;
}) {
  const pdfjs = await import("pdfjs-dist");
  const list = await page.getOperatorList();
  const colors: RGB[] = [];
  list.fnArray.forEach((fn, index) => {
    const args = list.argsArray[index];
    if (!Array.isArray(args)) return;
    if (fn === pdfjs.OPS.setFillRGBColor && args.length >= 3) {
      colors.push(scaleColor(args[0], args[1], args[2]));
    } else if (fn === pdfjs.OPS.setFillGray && args.length >= 1) {
      const value = Number(args[0]) * 255;
      colors.push({ r: value, g: value, b: value });
    } else if (fn === pdfjs.OPS.setFillCMYKColor && args.length >= 4) {
      const [c, m, y, k] = args.map(Number);
      colors.push({
        r: 255 * (1 - c) * (1 - k),
        g: 255 * (1 - m) * (1 - k),
        b: 255 * (1 - y) * (1 - k),
      });
    }
  });
  return dedupe(colors.map(roundColor)).slice(0, 12);
}

function svgPalette(text: string) {
  const found = [...text.matchAll(/fill\s*[:=]\s*["']?([^;"']+)/gi)].map((match) => match[1].trim());
  const colors = found.map(parseCssColor).filter((color): color is RGB => color != null);
  return dedupe(colors).slice(0, 12);
}

function parseCssColor(value: string): RGB | null {
  const named = NAMED[value.toLowerCase()];
  if (named) return named;
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? [...hex[1]].map((char) => char + char).join("") : hex[1];
    const number = Number.parseInt(raw, 16);
    return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return null;
  const parts = rgb[1].split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
  return { r: parts[0], g: parts[1], b: parts[2] };
}

function drawContain(image: CanvasImageSource & { width: number; height: number }, width: number, height: number): PixelBuffer {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("El navegador no pudo preparar el lienzo.");
  context.clearRect(0, 0, width, height);
  const sourceW = image.width || width;
  const sourceH = image.height || height;
  const scale = Math.min(width / sourceW, height / sourceH);
  const dw = sourceW * scale;
  const dh = sourceH * scale;
  context.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
  const pixels = context.getImageData(0, 0, width, height);
  return { width, height, data: pixels.data };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen. Prueba con PNG, JPG, SVG o PDF."));
    image.src = url;
  });
}

function fileKind(file: Blob, name: string) {
  const type = file.type.toLowerCase();
  const lower = name.toLowerCase();
  if (type === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (type === "image/svg+xml" || lower.endsWith(".svg")) return "svg";
  return "bitmap";
}

function scaleColor(r: unknown, g: unknown, b: unknown): RGB {
  return { r: Number(r) * 255, g: Number(g) * 255, b: Number(b) * 255 };
}

function roundColor(color: RGB): RGB {
  return { r: Math.round(color.r), g: Math.round(color.g), b: Math.round(color.b) };
}

function dedupe(colors: RGB[]) {
  const kept: RGB[] = [];
  for (const color of colors) {
    if (kept.some((item) => dist(item, color) < 12)) continue;
    kept.push(color);
  }
  return kept;
}

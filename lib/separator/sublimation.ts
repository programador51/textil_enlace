import { PROCESS_CHANNELS, rgbToCmyk } from "@/lib/separator/cmyk";
import type { PixelBuffer, RGB } from "@/lib/separator/types";

const PAPER = 255;

export const SUBLIMATION_GUIDE = {
  color:
    "Los colores quedaron en la gama que imprime una impresora de cuatricromía: cian, magenta, amarillo y negro. Un verde o un azul muy vivo se ve más apagado, porque esa impresora no llega a todo el RGB.",
  mirror: "El diseño está en espejo, listo para imprimirlo en el papel de sublimación.",
  iron: "En prensa, sobre playera de poliéster: 50 a 60 segundos, presión media, sin vapor. El algodón no guarda la sublimación. Si la tela es mezcla, el color queda más pálido. Con plancha casera el calor es desigual: plancha por zonas unos 60 segundos, sin vapor, y no deslices la plancha.",
};

export function sublimationImage(buffer: PixelBuffer): PixelBuffer {
  const { width, height, data } = buffer;
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + (width - 1 - x)) * 4;
      const dst = (y * width + x) * 4;
      const alpha = data[src + 3] / 255;
      const printed = alpha > 0.03 ? printedRgb(data[src], data[src + 1], data[src + 2]) : { r: PAPER, g: PAPER, b: PAPER };
      out[dst] = Math.round(printed.r * alpha + PAPER * (1 - alpha));
      out[dst + 1] = Math.round(printed.g * alpha + PAPER * (1 - alpha));
      out[dst + 2] = Math.round(printed.b * alpha + PAPER * (1 - alpha));
      out[dst + 3] = 255;
    }
  }
  return { width, height, data: out };
}

export function sublimationInstructions(size: { widthCm: number; heightCm: number }) {
  return [
    "Sublimación",
    `Tamaño: ${size.widthCm} × ${size.heightCm} cm.`,
    SUBLIMATION_GUIDE.color,
    SUBLIMATION_GUIDE.mirror,
    `Tiempo de plancha: ${SUBLIMATION_GUIDE.iron}`,
  ].join("\n");
}

export function printableShare(buffer: PixelBuffer) {
  const total = buffer.width * buffer.height;
  if (total === 0) return 0;
  let visible = 0;
  for (let index = 3; index < buffer.data.length; index += 4) {
    if (buffer.data[index] > 16) visible += 1;
  }
  return visible / total;
}

export function printedRgb(r: number, g: number, b: number): RGB {
  const cmyk = rgbToCmyk(r, g, b);
  const coverage = { c: cmyk.c, m: cmyk.m, y: cmyk.y, k: cmyk.k };
  let red = PAPER;
  let green = PAPER;
  let blue = PAPER;
  for (const channel of PROCESS_CHANNELS) {
    const amount = coverage[channel.key];
    red *= (1 - amount) + amount * (channel.r / 255);
    green *= (1 - amount) + amount * (channel.g / 255);
    blue *= (1 - amount) + amount * (channel.b / 255);
  }
  return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) };
}

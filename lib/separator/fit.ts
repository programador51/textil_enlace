import { MAX_EDGE } from "@/lib/separator/types";

export function outputSize(widthCm: number, heightCm: number, dpi: number) {
  let pxW = Math.max(1, Math.round((widthCm / 2.54) * dpi));
  let pxH = Math.max(1, Math.round((heightCm / 2.54) * dpi));
  let usedDpi = dpi;
  const edge = Math.max(pxW, pxH);
  if (edge > MAX_EDGE) {
    const scale = MAX_EDGE / edge;
    pxW = Math.max(1, Math.round(pxW * scale));
    pxH = Math.max(1, Math.round(pxH * scale));
    usedDpi = Math.max(72, Math.round(dpi * scale));
  }
  return { width: pxW, height: pxH, dpi: usedDpi, capped: usedDpi !== dpi };
}

import { ImageResponse } from "next/og";
import { SeparatorSocialCard } from "@/lib/og-card";

export const alt = "Separador de tintas planas · Capas, base blanca, receta y PSD en el navegador";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function SepararOpenGraphImage() {
  return new ImageResponse(<SeparatorSocialCard width={size.width} height={size.height} />, {
    ...size,
  });
}

import { ImageResponse } from "next/og";
import { BrandSocialCard } from "@/lib/og-card";

export const alt = "TextilEnlace · Impresión textil con talleres chicos y medianos de Monterrey";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<BrandSocialCard width={size.width} height={size.height} />, {
    ...size,
  });
}

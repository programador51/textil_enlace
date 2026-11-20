import { ImageResponse } from "next/og";
import { SeparatorSocialCard } from "@/lib/og-card";

export const alt = "TextilEnlace · Separa un logo para serigrafía, vinil, sublimación o bordado";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<SeparatorSocialCard width={size.width} height={size.height} />, {
    ...size,
  });
}

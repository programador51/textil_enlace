import { ImageResponse } from "next/og";
import { SiteMark } from "@/lib/site-icon";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<SiteMark size={size.width} />, { ...size });
}

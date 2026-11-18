import { writePsdUint8Array } from "ag-psd";

export function encodePsd(
  films: { name: string; width: number; height: number; rgba: Uint8ClampedArray; blendMode?: "normal" | "multiply" }[],
  dpi: number,
) {
  const first = films[0];
  if (!first) throw new Error("No hay capas para el archivo de Photoshop.");
  const topFirst = [...films].reverse();
  return writePsdUint8Array(
    {
      width: first.width,
      height: first.height,
      imageResources: {
        resolutionInfo: {
          horizontalResolution: dpi,
          horizontalResolutionUnit: "PPI",
          widthUnit: "Centimeters",
          verticalResolution: dpi,
          verticalResolutionUnit: "PPI",
          heightUnit: "Centimeters",
        },
      },
      children: topFirst.map((film) => ({
        name: film.name,
        blendMode: film.blendMode ?? "normal",
        imageData: {
          width: film.width,
          height: film.height,
          data: film.rgba,
        },
      })),
    },
    { noBackground: true },
  );
}

import type { SeparationKind } from "@/lib/separator/types";

export function artProcessSlugs(kind: SeparationKind) {
  if (kind === "NO_ENTRA") return ["dtf", "dtg"] as const;
  if (kind === "PLANAS" || kind === "SIMPLIFICA" || kind === "CMYK") return ["serigrafia"] as const;
  return null;
}

export function artOrientationCopy(input: {
  kind: SeparationKind;
  inkCount: number;
  reason: string;
  fabric: "CLARA" | "OSCURA";
}) {
  if (input.kind === "NO_ENTRA") {
    return {
      title: "Este archivo no se separa en pantallas",
      explanation: `${input.reason} Para una foto o un degradado suele usarse DTF o DTG. La solicitud sigue adelante y el taller cotiza por su medio.`,
    };
  }

  if (input.kind === "CMYK") {
    const base =
      input.fabric === "OSCURA"
        ? " En tela oscura se agrega una base blanca encogida, antes de las tintas."
        : " En tela clara no se agrega base blanca.";
    return {
      title: "Cuatricromía",
      explanation: `${input.reason} La orientación es serigrafía.${base}`,
    };
  }

  const count = input.inkCount === 1 ? "una tinta plana" : `${input.inkCount} tintas planas`;
  const base =
    input.fabric === "OSCURA"
      ? " En tela oscura se agrega una base blanca encogida, antes de las tintas."
      : " En tela clara no se agrega base blanca.";
  const review = input.kind === "SIMPLIFICA" ? " Algunos tonos parecidos se fundieron; conviene revisar las capas." : "";

  return {
    title: input.inkCount === 1 ? "Una tinta plana" : `${input.inkCount} tintas planas`,
    explanation: `El archivo se lee como serigrafía, ${count}: una pantalla por tinta.${base}${review}`,
  };
}

export function artMessageLine(input: { fileName: string; kind: SeparationKind; inkCount: number; reason: string }) {
  if (input.kind === "NO_ENTRA") {
    return `Archivo: ${input.fileName}. No se armaron pantallas. ${input.reason}`;
  }
  if (input.kind === "CMYK") {
    return `Archivo: ${input.fileName}, cuatricromía (cian, magenta, amarillo y negro). Las capas van con el folio.`;
  }
  const tintas = input.inkCount === 1 ? "1 tinta plana" : `${input.inkCount} tintas planas`;
  return `Archivo: ${input.fileName}, ${tintas}. Las capas van con el folio.`;
}

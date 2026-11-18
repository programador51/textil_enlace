import type { RecipeStep, SeparationKind } from "@/lib/separator/types";

export type ArtColor = {
  name: string;
  slug: string;
  hex: string;
  fine: boolean;
};

export type ArtPayload = {
  fileName: string;
  mimeType: string;
  sourceBase64: string;
  previewBase64: string;
  kind: SeparationKind;
  reason: string;
  fabric: "CLARA" | "OSCURA";
  inkCount: number;
  widthCm: number;
  heightCm: number;
  dpi: number;
  chokeMm: number;
  colors: ArtColor[];
  recipe: RecipeStep[];
};

export type ArtHint = Pick<ArtPayload, "kind" | "inkCount" | "reason" | "fabric">;

export type StoredArt = Omit<ArtPayload, "sourceBase64" | "previewBase64" | "mimeType">;

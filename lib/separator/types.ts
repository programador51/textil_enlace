export type RGB = { r: number; g: number; b: number };

export type PixelBuffer = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export const BACKGROUND = 65535;

export type SeparationKind = "PLANAS" | "SIMPLIFICA" | "CMYK" | "NO_ENTRA";

export type Ink = {
  index: number;
  name: string;
  slug: string;
  r: number;
  g: number;
  b: number;
  pixels: number;
  fine: boolean;
};

export type Analysis = {
  kind: SeparationKind;
  reason: string;
  inks: Ink[];
  assignment: Uint16Array;
  canExport: boolean;
  simplified: boolean;
};

export type RecipeKind = "base" | "flash" | "ink";

export type RecipeStep = {
  order: number;
  name: string;
  mesh: string;
  passes: number | null;
  kind: RecipeKind;
};

export type PrintRule = {
  baseMesh: string;
  basePasses: number;
  colorMesh: string;
  colorPasses: number;
  fineMesh: string;
  fineThresholdMm: number;
  inkNames: Record<string, string>;
};

export type NamedColor = {
  name: string;
  slug: string;
  hex: string;
  fine: boolean;
};

export const MAX_INKS = 6;
export const DEFAULT_CHOKE_MM = 1;
export const MAX_EDGE = 1400;
export const MAX_SOURCE_BYTES = 1_500_000;

export const INITIAL_RULE: PrintRule = {
  baseMesh: "43–48 hilos/cm",
  basePasses: 2,
  colorMesh: "62–77 hilos/cm",
  colorPasses: 1,
  fineMesh: "90 hilos/cm",
  fineThresholdMm: 0.4,
  inkNames: {},
};

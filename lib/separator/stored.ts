import type { ArtColor, StoredArt } from "@/lib/separator/payload";
import { INITIAL_RULE, type PrintRule, type RecipeStep } from "@/lib/separator/types";

export function asStoredArt(value: {
  fileName: string;
  kind: string;
  reason: string;
  fabric: string;
  inkCount: number;
  widthCm: number;
  heightCm: number;
  dpi: number;
  chokeMm: number;
  colors: unknown;
  recipe: unknown;
}): StoredArt | null {
  if (value.kind !== "PLANAS" && value.kind !== "SIMPLIFICA" && value.kind !== "CMYK" && value.kind !== "NO_ENTRA") return null;
  if (value.fabric !== "CLARA" && value.fabric !== "OSCURA") return null;
  return {
    fileName: value.fileName,
    kind: value.kind,
    reason: value.reason,
    fabric: value.fabric,
    inkCount: value.inkCount,
    widthCm: value.widthCm,
    heightCm: value.heightCm,
    dpi: value.dpi,
    chokeMm: value.chokeMm,
    colors: asColors(value.colors),
    recipe: asRecipe(value.recipe),
  };
}

export function asPrintRule(value: {
  baseMesh: string;
  basePasses: number;
  colorMesh: string;
  colorPasses: number;
  fineMesh: string;
  fineThresholdMm: number;
  inkNames: unknown;
} | null): PrintRule {
  if (!value) return INITIAL_RULE;
  return {
    baseMesh: value.baseMesh,
    basePasses: value.basePasses,
    colorMesh: value.colorMesh,
    colorPasses: value.colorPasses,
    fineMesh: value.fineMesh,
    fineThresholdMm: value.fineThresholdMm,
    inkNames: asInkNames(value.inkNames),
  };
}

function asColors(value: unknown): ArtColor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const color = item as Partial<ArtColor>;
    if (!color.name || !color.slug || !color.hex) return [];
    return [{ name: color.name, slug: color.slug, hex: color.hex, fine: Boolean(color.fine) }];
  });
}

function asRecipe(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const step = item as Partial<RecipeStep>;
    if (!step.name || !step.kind || step.order == null) return [];
    if (step.kind !== "base" && step.kind !== "flash" && step.kind !== "ink") return [];
    return [
      {
        order: step.order,
        name: step.name,
        mesh: step.mesh ?? "—",
        passes: step.passes ?? null,
        kind: step.kind,
      },
    ];
  });
}

function asInkNames(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const names: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim()) names[key] = item.trim();
  }
  return names;
}

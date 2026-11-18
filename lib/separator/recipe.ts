import { orderProcessInks } from "@/lib/separator/cmyk";
import { halftoneLines } from "@/lib/separator/halftone";
import { sortInksForPrint } from "@/lib/separator/color";
import { INITIAL_RULE, type Ink, type PrintRule, type RecipeStep } from "@/lib/separator/types";

export function applyRuleToRecipe(steps: RecipeStep[], colors: { name: string; slug: string; fine: boolean }[], rule: PrintRule) {
  return steps.map((step) => {
    if (step.kind === "flash") return step;
    if (step.kind === "base") return { ...step, mesh: rule.baseMesh, passes: rule.basePasses };
    const ink = colors.find((item) => item.name === step.name || item.slug === step.name);
    return {
      ...step,
      name: (ink && rule.inkNames[ink.slug]?.trim()) || step.name,
      mesh: ink?.fine ? rule.fineMesh : rule.colorMesh,
      passes: rule.colorPasses,
    };
  });
}

export function buildRecipe(
  inks: Ink[],
  fabric: "CLARA" | "OSCURA",
  rule: PrintRule = INITIAL_RULE,
  sequence: "spot" | "cmyk" = "spot",
): RecipeStep[] {
  const ordered = sequence === "cmyk" ? orderProcessInks(inks) : sortInksForPrint(inks);
  const steps: RecipeStep[] = [];

  if (fabric === "OSCURA") {
    steps.push({ order: 1, name: "Base blanca", mesh: rule.baseMesh, passes: rule.basePasses, kind: "base" });
    steps.push({ order: 2, name: "Flash", mesh: "—", passes: null, kind: "flash" });
  }

  for (const ink of ordered) {
    const renamed = rule.inkNames[ink.slug]?.trim() || ink.name;
    steps.push({
      order: steps.length + 1,
      name: renamed,
      mesh: ink.fine ? rule.fineMesh : rule.colorMesh,
      passes: rule.colorPasses,
      kind: "ink",
    });
  }

  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

export function recipeText(input: {
  fileName: string;
  fabric: "CLARA" | "OSCURA";
  widthCm: number;
  heightCm: number;
  dpi: number;
  chokeMm: number;
  steps: RecipeStep[];
  source: "inicial" | "taller";
  process?: "spot" | "cmyk";
}) {
  const lines = [
    "Receta de impresión",
    "",
    `Archivo: ${input.fileName}`,
    `Tela: ${input.fabric === "OSCURA" ? "oscura" : "clara"}`,
    `Tamaño: ${input.widthCm} cm × ${input.heightCm} cm`,
    `Resolución: ${input.dpi} ppp`,
  ];

  if (input.fabric === "OSCURA") {
    lines.push(`Base blanca: encogida ${input.chokeMm} mm, la misma medida en todo el diseño.`);
  }
  if (input.process === "cmyk") {
    lines.push(
      `Cuatricromía con trama de semitonos, ${halftoneLines(input.dpi)} líneas por pulgada. Cian a 15°, magenta a 75°, amarillo a 0° y negro a 45°. Donde no hay punto, la capa es transparente.`,
    );
  }

  lines.push(
    input.source === "inicial"
      ? "Esta receta usa la regla inicial, para que todas las personas vean las mismas capas."
      : "Esta receta usa los hilos y los nombres que guardó el taller.",
    "El horno y la marca del bote, si el taller no la escribió, no los pone el sistema.",
    "El ZIP no imprime la película. El taller la imprime con su equipo.",
    "El archivo capas.psd abre esas capas transparentes, una sobre otra, para ver cómo queda la impresión en Photoshop.",
    "",
    "Orden | Qué se imprime | Malla | Pasadas",
  );

  for (const step of input.steps) {
    const passes = step.passes == null ? "—" : String(step.passes);
    lines.push(`${step.order} | ${step.name} | ${step.mesh} | ${passes}`);
  }

  if (input.steps.some((step) => step.kind === "ink" && step.name.startsWith("negro"))) {
    lines.push("", "El negro queda al final.");
  }

  return lines.join("\n");
}

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { assignPalette } from "@/lib/separator/analyze";
import { rasterizeFile } from "@/lib/separator/decode";
import { applyRuleToRecipe } from "@/lib/separator/recipe";
import { packSeparately } from "@/lib/separator/run";
import type { StoredArt } from "@/lib/separator/payload";
import { INITIAL_RULE, type Ink, type PrintRule, type RecipeStep } from "@/lib/separator/types";

export function ArtPanel({ folio, art, rule }: { folio: string; art: StoredArt; rule?: PrintRule | null }) {
  const starting = useMemo(
    () => (rule ? applyRuleToRecipe(art.recipe, art.colors, rule) : art.recipe),
    [art.colors, art.recipe, rule],
  );
  const [steps, setSteps] = useState<RecipeStep[]>(starting);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipHref, setZipHref] = useState<string | null>(null);
  const separated = art.kind === "PLANAS" || art.kind === "SIMPLIFICA" || art.kind === "CMYK";

  async function download() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/arte/${folio}`);
      if (!response.ok) throw new Error("No se pudo abrir el archivo de esta solicitud.");
      const blob = await response.blob();
      const file = new File([blob], art.fileName, { type: blob.type || "application/octet-stream" });
      const drawn = await rasterizeFile(file, art.widthCm, art.heightCm, art.dpi);
      const analysis = assignPalette(drawn.buffer, art.colors, { dpi: drawn.dpi, fineThresholdMm: rule?.fineThresholdMm ?? INITIAL_RULE.fineThresholdMm });
      const process = art.kind === "CMYK" ? "cmyk" : "spot";
      if (process === "spot" && !analysis.canExport) throw new Error(analysis.reason);
      const zip = await packSeparately({
        pixels: drawn.buffer.data,
        width: drawn.buffer.width,
        height: drawn.buffer.height,
        assignment: analysis.assignment,
        inks: process === "cmyk" ? storedInks(art) : analysis.inks,
        fabric: art.fabric,
        dpi: drawn.dpi,
        chokeMm: art.chokeMm,
        fileName: art.fileName,
        widthCm: art.widthCm,
        heightCm: art.heightCm,
        steps,
        source: rule ? "taller" : "inicial",
        process,
      });
      const copy = new Uint8Array(zip.byteLength);
      copy.set(zip);
      const href = URL.createObjectURL(new Blob([copy], { type: "application/zip" }));
      setZipHref((current) => {
        if (current) URL.revokeObjectURL(current);
        return href;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo armar el ZIP.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-3xl">Archivo y capas</h2>
      <p className="mt-2 leading-7">{art.reason}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {art.fileName} · {art.widthCm} × {art.heightCm} cm · {art.dpi} ppp
        {art.fabric === "OSCURA" ? ` · base blanca encogida ${art.chokeMm} mm` : " · sin base blanca"}
      </p>
      <div className="relative mt-4 aspect-[4/3] max-w-md overflow-hidden rounded-2xl border border-line bg-paper">
        <Image src={`/api/arte/${folio}/vista`} alt="Vista del diseño sobre la tela" fill className="object-contain" unoptimized />
      </div>
      {separated && steps.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <caption className="pb-2 text-left font-semibold">{rule ? "Receta de este taller" : "Receta inicial"}</caption>
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-3 font-semibold">Orden</th>
                <th className="py-2 pr-3 font-semibold">Qué se imprime</th>
                <th className="py-2 pr-3 font-semibold">Malla</th>
                <th className="py-2 font-semibold">Pasadas</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, index) => (
                <tr key={`${step.kind}-${step.name}-${index}`} className="border-b border-line/80">
                  <td className="py-2 pr-3">{step.order}</td>
                  <td className="py-2 pr-3 font-semibold">{step.name}</td>
                  <td className="py-2 pr-3">{step.mesh}</td>
                  <td className="py-2">
                    {step.passes ?? "—"}
                    {rule && step.kind === "ink" ? (
                      <span className="ml-3 inline-flex gap-2">
                        <button type="button" className="font-semibold text-dye" onClick={() => move(index, -1)}>
                          Subir
                        </button>
                        <button type="button" className="font-semibold text-dye" onClick={() => move(index, 1)}>
                          Bajar
                        </button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {error ? <p className="alert mt-4">{error}</p> : null}
      {separated && zipHref ? (
        <a className="btn btn-teal mt-4" href={zipHref} download={`${folio}-capas.zip`}>
          Descargar {folio}-capas.zip
        </a>
      ) : null}
      {separated && !zipHref ? (
        <button type="button" className="btn btn-teal mt-4" onClick={() => void download()} disabled={pending}>
          {pending ? "Armando el ZIP…" : "Descargar capas y receta"}
        </button>
      ) : null}
      {separated ? null : (
        <p className="notice mt-4">Este archivo no produjo capas. La solicitud igual se envió, y la orientación apunta a DTF o DTG.</p>
      )}
    </section>
  );

  function move(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const nextIndex = index + direction;
      const currentStep = current[index];
      const neighbor = current[nextIndex];
      if (!currentStep || !neighbor || currentStep.kind !== "ink" || neighbor.kind !== "ink") return current;
      const copy = [...current];
      copy[index] = neighbor;
      copy[nextIndex] = currentStep;
      return copy.map((step, stepIndex) => ({ ...step, order: stepIndex + 1 }));
    });
  }
}

function storedInks(art: StoredArt): Ink[] {
  return art.colors.map((color, index) => {
    const value = Number.parseInt(color.hex.slice(1), 16);
    return {
      index,
      name: color.name,
      slug: color.slug,
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
      pixels: 0,
      fine: color.fine,
    };
  });
}

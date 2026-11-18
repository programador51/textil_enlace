"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mergeInks } from "@/lib/separator/analyze";
import { hexOf } from "@/lib/separator/color";
import { rasterizeFile } from "@/lib/separator/decode";
import { buildPreview } from "@/lib/separator/films";
import { buildRecipe } from "@/lib/separator/recipe";
import { packSeparately, analyzeSeparately } from "@/lib/separator/run";
import { DEFAULT_CHOKE_MM, INITIAL_RULE, MAX_SOURCE_BYTES, type PixelBuffer, type RecipeStep } from "@/lib/separator/types";
import type { ArtPayload } from "@/lib/separator/payload";

type Fabric = "CLARA" | "OSCURA";

export function SeparatorStudio({
  mode,
  fabricLock,
  onArt,
}: {
  mode: "standalone" | "attach";
  fabricLock?: Fabric | null;
  onArt?: (art: ArtPayload | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fabricChoice, setFabricChoice] = useState<Fabric>(fabricLock ?? "OSCURA");
  const fabric = fabricLock ?? fabricChoice;
  const [widthCm, setWidthCm] = useState("25");
  const [heightCm, setHeightCm] = useState("20");
  const [dpi, setDpi] = useState("150");
  const [raster, setRaster] = useState<PixelBuffer | null>(null);
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof analyzeSeparately>> | null>(null);
  const [usedDpi, setUsedDpi] = useState(150);
  const [merge, setMerge] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"separar" | "zip" | null>(null);
  const [zipHref, setZipHref] = useState<string | null>(null);

  const recipe = useMemo<RecipeStep[]>(
    () =>
      analysis?.canExport
        ? buildRecipe(analysis.inks, fabric, INITIAL_RULE, analysis.kind === "CMYK" ? "cmyk" : "spot")
        : [],
    [analysis, fabric],
  );

  useEffect(() => {
    if (!onArt) return;
    if (!file || !analysis || !raster) {
      onArt(null);
      return;
    }
    const kind = analysis.kind;
    let cancelled = false;
    void (async () => {
      const previewBase64 = await pixelsToPngBase64(analysis.preview);
      const sourceBase64 = await blobToBase64(file);
      if (cancelled) return;
      onArt({
        fileName: file.name.slice(0, 120),
        mimeType: file.type || "application/octet-stream",
        sourceBase64,
        previewBase64,
        kind,
        reason: analysis.reason,
        fabric,
        inkCount: analysis.inks.length,
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        dpi: usedDpi,
        chokeMm: fabric === "OSCURA" ? DEFAULT_CHOKE_MM : 0,
        colors: analysis.inks.map((ink) => ({ name: ink.name, slug: ink.slug, hex: hexOf(ink), fine: ink.fine })),
        recipe,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [analysis, fabric, file, heightCm, onArt, raster, recipe, usedDpi, widthCm]);

  async function separate(nextFile = file) {
    const size = readSize();
    if (!nextFile || !size) return;
    if (nextFile.size > MAX_SOURCE_BYTES) {
      setError("El archivo pasa de 1.5 MB. Exporta el logo más liviano, en PNG o SVG.");
      return;
    }
    setError(null);
    setPending("separar");
    setAnalysis(null);
    setZipHref((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setMerge([]);
    try {
      const drawn = await rasterizeFile(nextFile, size.widthCm, size.heightCm, size.dpi);
      const result = await analyzeSeparately({
        pixels: drawn.buffer.data,
        width: drawn.buffer.width,
        height: drawn.buffer.height,
        palette: drawn.palette,
        dpi: drawn.dpi,
        fineThresholdMm: INITIAL_RULE.fineThresholdMm,
        fabric,
        chokeMm: fabric === "OSCURA" ? DEFAULT_CHOKE_MM : 0,
      });
      setRaster(drawn.buffer);
      setUsedDpi(drawn.dpi);
      setAnalysis(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo separar el archivo.");
    } finally {
      setPending(null);
    }
  }

  function fuse() {
    if (!analysis || !raster || merge.length !== 2) return;
    const next = mergeInks(analysis, raster, merge[0], merge[1], { dpi: usedDpi, fineThresholdMm: INITIAL_RULE.fineThresholdMm });
    const preview = buildPreview({
      assignment: next.assignment,
      width: raster.width,
      height: raster.height,
      inks: next.inks,
      fabric,
      dpi: usedDpi,
      chokeMm: fabric === "OSCURA" ? DEFAULT_CHOKE_MM : 0,
    });
    setAnalysis({ ...next, preview });
    setMerge([]);
  }

  async function download() {
    if (!analysis?.canExport || !raster) return;
    setPending("zip");
    setError(null);
    try {
      const zip = await packSeparately({
        pixels: raster.data,
        width: raster.width,
        height: raster.height,
        assignment: analysis.assignment,
        inks: analysis.inks,
        fabric,
        dpi: usedDpi,
        chokeMm: fabric === "OSCURA" ? DEFAULT_CHOKE_MM : 0,
        fileName: file?.name ?? "logo",
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        steps: recipe,
        source: "inicial",
        process: analysis.kind === "CMYK" ? "cmyk" : "spot",
      });
      const href = zipHrefFrom(zip);
      setZipHref((current) => {
        if (current) URL.revokeObjectURL(current);
        return href;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo descargar el ZIP.");
    } finally {
      setPending(null);
    }
  }

  function readSize() {
    const width = Number(widthCm);
    const height = Number(heightCm);
    const points = Number(dpi);
    if (!Number.isFinite(width) || width < 1 || width > 60) {
      setError("El ancho va de 1 a 60 cm.");
      return null;
    }
    if (!Number.isFinite(height) || height < 1 || height > 60) {
      setError("El alto va de 1 a 60 cm.");
      return null;
    }
    if (!Number.isInteger(points) || points < 72 || points > 300) {
      setError("La resolución va de 72 a 300 ppp.");
      return null;
    }
    return { widthCm: width, heightCm: height, dpi: points };
  }

  return (
    <section className={mode === "standalone" ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" : "grid gap-5"}>
      <div className="grid gap-5">
        {mode === "attach" ? (
          <div>
            <h3 className="font-serif text-2xl">Logo, si ya lo tienes</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Puedes seguir sin archivo. Si lo adjuntas, el separador arma las capas: tintas planas, o cuatricromía si hay más de seis. No calcula un precio.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}

        <label className="field-label">
          PNG, JPG, SVG o PDF
          <input
            className="field"
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.pdf,image/png,image/jpeg,image/svg+xml,application/pdf"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setAnalysis(null);
              setRaster(null);
              onArt?.(null);
            }}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => void loadExample("/ejemplos/logo-tintas.svg", "logo-tintas.svg", setFile)}>
            Probar logo de tintas
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void loadExample("/ejemplos/degradado.svg", "degradado.svg", setFile)}>
            Probar un degradado
          </button>
        </div>

        <fieldset className="grid gap-2" disabled={Boolean(fabricLock)}>
          <legend className="font-semibold">Tela</legend>
          <label className="flex items-center gap-3">
            <input type="radio" name="separador-tela" checked={fabric === "CLARA"} onChange={() => setFabricChoice("CLARA")} />
            Tela clara, sin base
          </label>
          <label className="flex items-center gap-3">
            <input type="radio" name="separador-tela" checked={fabric === "OSCURA"} onChange={() => setFabricChoice("OSCURA")} />
            Tela oscura, con base blanca
          </label>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field-label">
            Ancho (cm)
            <input className="field" inputMode="decimal" value={widthCm} onChange={(event) => setWidthCm(event.target.value)} />
          </label>
          <label className="field-label">
            Alto (cm)
            <input className="field" inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} />
          </label>
          <label className="field-label">
            Resolución (ppp)
            <input className="field" inputMode="numeric" value={dpi} onChange={(event) => setDpi(event.target.value)} />
          </label>
        </div>

        <button type="button" className="btn btn-primary justify-self-start" onClick={() => void separate()} disabled={!file || pending != null}>
          {pending === "separar" ? "Separando…" : "Separar tintas"}
        </button>

        {analysis ? (
          <div className="grid gap-4">
            <p className={analysis.kind === "NO_ENTRA" ? "alert" : "notice"} role="status">
              {analysis.reason}
            </p>
            {analysis.kind === "CMYK" ? (
              <p>
                Cuatricromía con trama de semitonos: {analysis.inks.map((ink) => ink.name).join(", ")}.
              </p>
            ) : null}
            {analysis.inks.length > 0 && analysis.kind !== "CMYK" ? (
              <div>
                <p className="font-semibold">Tintas</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {analysis.inks.map((ink) => {
                    const picked = merge.includes(ink.index);
                    return (
                      <li key={ink.slug}>
                        <button
                          type="button"
                          className={`chip gap-2 ${picked ? "bg-teal text-white" : ""}`}
                          onClick={() =>
                            setMerge((current) =>
                              current.includes(ink.index) ? current.filter((item) => item !== ink.index) : [...current, ink.index].slice(-2),
                            )
                          }
                        >
                          <span className="inline-block h-3 w-3 rounded-full border border-line" style={{ background: hexOf(ink) }} />
                          {ink.name}
                          {ink.fine ? " · detalle fino" : ""}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className="btn btn-secondary mt-3" onClick={fuse} disabled={merge.length !== 2}>
                  Fundir las dos tintas marcadas
                </button>
              </div>
            ) : null}
            {recipe.length > 0 ? <RecipeTable steps={recipe} /> : null}
            {analysis.canExport && zipHref ? (
              <a className="btn btn-teal justify-self-start" href={zipHref} download="capas-serigrafia.zip">
                Descargar capas-serigrafia.zip
              </a>
            ) : null}
            {analysis.canExport && !zipHref ? (
              <button type="button" className="btn btn-teal justify-self-start" onClick={() => void download()} disabled={pending != null}>
                {pending === "zip" ? "Armando el ZIP…" : "Descargar capas y receta"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <PreviewPanel preview={analysis?.preview ?? null} fabric={fabric} />
    </section>
  );
}

function RecipeTable({ steps }: { steps: RecipeStep[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <caption className="pb-2 text-left font-semibold">Receta inicial</caption>
        <thead>
          <tr className="border-b border-line text-ink-soft">
            <th className="py-2 pr-3 font-semibold">Orden</th>
            <th className="py-2 pr-3 font-semibold">Qué se imprime</th>
            <th className="py-2 pr-3 font-semibold">Malla</th>
            <th className="py-2 font-semibold">Pasadas</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={`${step.order}-${step.name}`} className="border-b border-line/80">
              <td className="py-2 pr-3">{step.order}</td>
              <td className="py-2 pr-3 font-semibold">{step.name}</td>
              <td className="py-2 pr-3">{step.mesh}</td>
              <td className="py-2">{step.passes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewPanel({ preview, fabric }: { preview: PixelBuffer | null; fabric: Fabric }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.putImageData(new ImageData(new Uint8ClampedArray(preview.data), preview.width, preview.height), 0, 0);
  }, [preview]);

  return (
    <aside className="panel">
      <p className="text-xs font-bold tracking-[0.16em] text-gold uppercase">Vista sobre la tela</p>
      <p className="mt-2 text-sm text-ink-soft">{fabric === "OSCURA" ? "Playera oscura, con base blanca debajo." : "Playera clara, sin base."}</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-paper">
        {preview ? (
          <canvas ref={canvasRef} className="h-auto w-full" role="img" aria-label="Diseño separado sobre la tela" />
        ) : (
          <p className="p-6 text-sm text-ink-soft">Aquí se ve el diseño antes de descargar.</p>
        )}
      </div>
    </aside>
  );
}

async function loadExample(path: string, name: string, setFile: (file: File) => void) {
  const response = await fetch(path);
  const blob = await response.blob();
  setFile(new File([blob], name, { type: "image/svg+xml" }));
}

async function pixelsToPngBase64(buffer: PixelBuffer) {
  const canvas = document.createElement("canvas");
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo armar la vista.");
  context.putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("No se pudo armar la vista."))), "image/png");
  });
  return blobToBase64(blob);
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function zipHrefFrom(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return URL.createObjectURL(new Blob([copy], { type: "application/zip" }));
}

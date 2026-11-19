import { analyzePixels } from "@/lib/separator/analyze";
import { buildFilms, buildPreview } from "@/lib/separator/films";
import { encodePng } from "@/lib/separator/png";
import { recipeText } from "@/lib/separator/recipe";
import type { Ink, RecipeStep, RGB } from "@/lib/separator/types";
import { zipStore } from "@/lib/separator/zip";

type Inbound = AnalyzeJob | PackJob;

type AnalyzeJob = {
  type: "analyze";
  buffer: ArrayBuffer;
  width: number;
  height: number;
  palette: RGB[] | null;
  dpi: number;
  fineThresholdMm: number;
  fabric: "CLARA" | "OSCURA";
  chokeMm: number;
  keepSpots?: boolean;
};

type PackJob = {
  type: "pack";
  buffer: ArrayBuffer;
  width: number;
  height: number;
  assignment: ArrayBuffer;
  inks: Ink[];
  fabric: "CLARA" | "OSCURA";
  dpi: number;
  chokeMm: number;
  fileName: string;
  widthCm: number;
  heightCm: number;
  steps: RecipeStep[];
  source: "inicial" | "taller";
};

type WorkerScope = {
  onmessage: ((event: MessageEvent<Inbound>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<Inbound>) => {
  const job = event.data;
  if (job.type === "analyze") {
    const data = new Uint8ClampedArray(job.buffer);
    const analysis = analyzePixels(
      { width: job.width, height: job.height, data },
      { palette: job.palette ?? undefined, dpi: job.dpi, fineThresholdMm: job.fineThresholdMm, keepSpots: job.keepSpots === true },
    );
    const preview = buildPreview({
      assignment: analysis.assignment,
      width: job.width,
      height: job.height,
      inks: analysis.inks,
      fabric: job.fabric,
      dpi: job.dpi,
      chokeMm: job.chokeMm,
      pixels: data,
      process: analysis.kind === "CMYK" ? "cmyk" : "spot",
    });
    scope.postMessage(
      {
        type: "analyzed",
        kind: analysis.kind,
        reason: analysis.reason,
        canExport: analysis.canExport,
        simplified: analysis.simplified,
        inks: analysis.inks,
        assignment: analysis.assignment.buffer,
        preview: { width: preview.width, height: preview.height, buffer: preview.data.buffer },
      },
      [analysis.assignment.buffer, preview.data.buffer],
    );
    return;
  }

  void pack(job);
};

async function pack(job: PackJob) {
  try {
    const assignment = new Uint16Array(job.assignment);
    const { films } = buildFilms({
      assignment,
      width: job.width,
      height: job.height,
      inks: job.inks,
      fabric: job.fabric,
      dpi: job.dpi,
      chokeMm: job.chokeMm,
    });
    const files = [
      {
        name: "receta.txt",
        data: new TextEncoder().encode(
          recipeText({
            fileName: job.fileName,
            fabric: job.fabric,
            widthCm: job.widthCm,
            heightCm: job.heightCm,
            dpi: job.dpi,
            chokeMm: job.chokeMm,
            steps: job.steps,
            source: job.source,
          }),
        ),
      },
    ];
    for (const film of films) {
      files.push({ name: film.fileName, data: await encodePng(film.width, film.height, film.rgba) });
    }
    const zip = zipStore(files);
    scope.postMessage({ type: "packed", zip: zip.buffer }, [zip.buffer]);
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : "No se pudo armar el ZIP." });
  }
}

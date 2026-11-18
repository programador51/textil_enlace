import { analyzePixels } from "@/lib/separator/analyze";
import { buildFilms, buildPreview } from "@/lib/separator/films";
import { encodePng } from "@/lib/separator/png";
import { encodePsd } from "@/lib/separator/psd";
import { recipeText } from "@/lib/separator/recipe";
import type { Ink, PixelBuffer, RecipeStep, RGB, SeparationKind } from "@/lib/separator/types";
import { zipStore } from "@/lib/separator/zip";

export type Analyzed = {
  kind: SeparationKind;
  reason: string;
  canExport: boolean;
  simplified: boolean;
  inks: Ink[];
  assignment: Uint16Array;
  preview: PixelBuffer;
};

type WorkerReply =
  | {
      type: "analyzed";
      kind: SeparationKind;
      reason: string;
      canExport: boolean;
      simplified: boolean;
      inks: Ink[];
      assignment: ArrayBuffer;
      preview: { width: number; height: number; buffer: ArrayBuffer };
    }
  | { type: "packed"; zip: ArrayBuffer }
  | { type: "error"; message: string };

export function analyzeSeparately(input: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  palette: RGB[] | null;
  dpi: number;
  fineThresholdMm: number;
  fabric: "CLARA" | "OSCURA";
  chokeMm: number;
}) {
  const payload = {
    type: "analyze" as const,
    buffer: cloneBytes(input.pixels),
    width: input.width,
    height: input.height,
    palette: input.palette,
    dpi: input.dpi,
    fineThresholdMm: input.fineThresholdMm,
    fabric: input.fabric,
    chokeMm: input.chokeMm,
  };

  return withWorker(payload, () => {
    const data = new Uint8ClampedArray(payload.buffer.slice(0));
    const analysis = analyzePixels(
      { width: input.width, height: input.height, data },
      { palette: input.palette ?? undefined, dpi: input.dpi, fineThresholdMm: input.fineThresholdMm },
    );
    const preview = buildPreview({
      assignment: analysis.assignment,
      width: input.width,
      height: input.height,
      inks: analysis.inks,
      fabric: input.fabric,
      dpi: input.dpi,
      chokeMm: input.chokeMm,
      pixels: data,
      process: analysis.kind === "CMYK" ? "cmyk" : "spot",
    });
    return {
      kind: analysis.kind,
      reason: analysis.reason,
      canExport: analysis.canExport,
      simplified: analysis.simplified,
      inks: analysis.inks,
      assignment: analysis.assignment,
      preview,
    } satisfies Analyzed;
  }).then((reply): Analyzed => {
    if (isAnalyzed(reply)) return reply;
    if (reply.type !== "analyzed") throw new Error("No se pudo separar el archivo.");
    return {
      kind: reply.kind,
      reason: reply.reason,
      canExport: reply.canExport,
      simplified: reply.simplified,
      inks: reply.inks,
      assignment: new Uint16Array(reply.assignment),
      preview: {
        width: reply.preview.width,
        height: reply.preview.height,
        data: new Uint8ClampedArray(reply.preview.buffer),
      },
    };
  });
}

export async function packSeparately(input: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  assignment: Uint16Array;
  inks: Ink[];
  fabric: "CLARA" | "OSCURA";
  dpi: number;
  chokeMm: number;
  fileName: string;
  widthCm: number;
  heightCm: number;
  steps: RecipeStep[];
  source: "inicial" | "taller";
  process?: "spot" | "cmyk";
}) {
  const process = input.process ?? "spot";
  const { films } = buildFilms({
    assignment: input.assignment,
    width: input.width,
    height: input.height,
    inks: input.inks,
    fabric: input.fabric,
    dpi: input.dpi,
    chokeMm: input.chokeMm,
    pixels: input.pixels,
    process,
  });
  const files: { name: string; data: Uint8Array }[] = [
    {
      name: "receta.txt",
      data: new TextEncoder().encode(
        recipeText({
          fileName: input.fileName,
          fabric: input.fabric,
          widthCm: input.widthCm,
          heightCm: input.heightCm,
          dpi: input.dpi,
          chokeMm: input.chokeMm,
          steps: input.steps,
          source: input.source,
          process,
        }),
      ),
    },
  ];
  for (const film of films) {
    files.push({ name: film.fileName, data: await encodeFilm(film.width, film.height, film.rgba) });
    await yieldToPaint();
  }
  files.push({ name: "capas.psd", data: encodePsd(films, input.dpi) });
  return zipStore(files);
}

async function encodeFilm(width: number, height: number, rgba: Uint8ClampedArray) {
  if (typeof document === "undefined") return encodePng(width, height, rgba);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return encodePng(width, height, rgba);
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return encodePng(width, height, rgba);
  return new Uint8Array(await blob.arrayBuffer());
}

function yieldToPaint() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function cloneBytes(view: ArrayBufferView) {
  const copy = new ArrayBuffer(view.byteLength);
  new Uint8Array(copy).set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return copy;
}

function isAnalyzed(value: Analyzed | WorkerReply): value is Analyzed {
  return value instanceof Object && "assignment" in value && value.assignment instanceof Uint16Array;
}

function withWorker<T>(message: { type: string; buffer: ArrayBuffer; assignment?: ArrayBuffer }, local: () => T | Promise<T>): Promise<T | WorkerReply> {
  if (typeof Worker === "undefined") return Promise.resolve(local());

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./separator.worker.ts", import.meta.url));
    } catch {
      void Promise.resolve(local()).then(resolve);
      return;
    }

    const finish = (value: T | WorkerReply) => {
      worker.terminate();
      resolve(value);
    };
    const recover = () => {
      worker.terminate();
      void Promise.resolve(local()).then(resolve);
    };

    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.type === "error") {
        recover();
        return;
      }
      finish(event.data);
    };
    worker.onerror = () => recover();

    const copy = { ...message, buffer: message.buffer.slice(0) };
    const transfer: ArrayBuffer[] = [copy.buffer];
    if (message.assignment) {
      copy.assignment = message.assignment.slice(0);
      transfer.push(copy.assignment);
    }
    worker.postMessage(copy, transfer);
  });
}

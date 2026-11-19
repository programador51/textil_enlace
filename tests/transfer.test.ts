import assert from "node:assert/strict";
import test from "node:test";
import { analyzePixels } from "../lib/separator/analyze";
import { encodePng } from "../lib/separator/png";
import { sublimationImage, printedRgb } from "../lib/separator/sublimation";
import { BACKGROUND, type Ink, type PixelBuffer } from "../lib/separator/types";
import { buildVinylDxf, planVinyl, vinylInstructions } from "../lib/separator/vinyl";

function fill(buffer: PixelBuffer, x0: number, y0: number, x1: number, y1: number, color: [number, number, number, number]) {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const offset = (y * buffer.width + x) * 4;
      buffer.data[offset] = color[0];
      buffer.data[offset + 1] = color[1];
      buffer.data[offset + 2] = color[2];
      buffer.data[offset + 3] = color[3];
    }
  }
}

function solid(width: number, height: number) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) } satisfies PixelBuffer;
}

function ink(partial: Partial<Ink> & Pick<Ink, "name" | "r" | "g" | "b">): Ink {
  return {
    index: partial.index ?? 0,
    name: partial.name,
    slug: partial.slug ?? partial.name,
    r: partial.r,
    g: partial.g,
    b: partial.b,
    pixels: partial.pixels ?? 10,
    fine: partial.fine ?? false,
  };
}

test("el vinil rechaza una foto o un degradado y dice por qué", () => {
  const buffer = solid(64, 8);
  for (let x = 0; x < 64; x += 1) {
    const red = Math.round(255 - (x / 63) * 255);
    const blue = Math.round((x / 63) * 255);
    fill(buffer, x, 0, x + 1, 8, [red, 0, blue, 255]);
  }
  const analysis = analyzePixels(buffer, { keepSpots: true });
  const plan = planVinyl({ kind: analysis.kind, reason: analysis.reason, inks: analysis.inks, fabric: "CLARA", widthCm: 20, heightCm: 8 });
  assert.equal(analysis.kind, "NO_ENTRA");
  assert.equal(plan.allowed, false);
  assert.match(plan.reason, /vinil/i);
  assert.match(plan.reason, /foto|degradado/i);
  assert.match(plan.reason, /navaja/i);
});

test("más de seis colores sólidos siguen siendo capas de vinil", () => {
  const buffer = solid(70, 10);
  const colors: Array<[number, number, number, number]> = [
    [220, 30, 30, 255],
    [30, 160, 40, 255],
    [30, 40, 210, 255],
    [240, 210, 20, 255],
    [20, 190, 210, 255],
    [190, 30, 170, 255],
    [10, 10, 10, 255],
  ];
  colors.forEach((color, index) => fill(buffer, index * 10, 0, index * 10 + 10, 10, color));
  const kept = analyzePixels(buffer, { keepSpots: true });
  assert.equal(kept.kind, "PLANAS");
  assert.equal(kept.inks.length, 7);
  assert.equal(analyzePixels(buffer).kind, "CMYK");
});

test("el DXF trae una capa por color, en el orden de plancha y en espejo", () => {
  const buffer = solid(24, 12);
  fill(buffer, 0, 0, 24, 12, [255, 255, 255, 255]);
  fill(buffer, 2, 2, 8, 10, [240, 210, 20, 255]);
  fill(buffer, 10, 2, 16, 10, [200, 30, 30, 255]);
  const analysis = analyzePixels(buffer, { keepSpots: true });
  const plan = planVinyl({
    kind: analysis.kind,
    reason: analysis.reason,
    inks: analysis.inks,
    fabric: "OSCURA",
    widthCm: 12,
    heightCm: 6,
  });
  assert.equal(plan.allowed, true);
  assert.deepEqual(
    plan.order.map((item) => item.name),
    ["amarillo", "rojo"],
  );
  assert.match(plan.vinyl, /opaco/);
  assert.match(plan.iron, /12 a 15/);
  const text = vinylInstructions(plan, { widthCm: 12, heightCm: 6 });
  assert.match(text, /1\. amarillo/);
  assert.match(text, /2\. rojo/);

  const dxf = buildVinylDxf({
    assignment: analysis.assignment,
    width: buffer.width,
    height: buffer.height,
    inks: analysis.inks,
    widthCm: 12,
    heightCm: 6,
  });
  assert.match(dxf, /\$INSUNITS\n70\n4/);
  assert.match(dxf, /01-AMARILLO/);
  assert.match(dxf, /02-ROJO/);
  assert.equal(dxf.split("POLYLINE").length - 1, 2);
  const entities = dxf.slice(dxf.indexOf("ENTITIES"));
  const yellow = entities.slice(entities.indexOf("01-AMARILLO"), entities.indexOf("02-ROJO"));
  const xs = [...yellow.matchAll(/\n10\n(-?\d+\.\d+)/g)].map((match) => Number(match[1]));
  assert.ok(xs.length >= 4);
  assert.ok(Math.min(...xs) > 60, `el amarillo de la izquierda debía quedar a la derecha, xs=${xs.join(",")}`);
});

test("un bloque sólido se cierra en un contorno", () => {
  const width = 12;
  const height = 8;
  const assignment = new Uint16Array(width * height).fill(BACKGROUND);
  for (let y = 2; y < 6; y += 1) {
    for (let x = 2; x < 7; x += 1) assignment[y * width + x] = 0;
  }
  const dxf = buildVinylDxf({
    assignment,
    width,
    height,
    inks: [ink({ name: "rojo", r: 200, g: 20, b: 20 })],
    widthCm: 12,
    heightCm: 8,
  });
  assert.match(dxf, /01-ROJO/);
  assert.equal(dxf.split("VERTEX").length - 1 >= 4, true);
});

test("la navaja, la velocidad y la máquina cambian con el detalle y el tamaño", () => {
  const wide = planVinyl({
    kind: "PLANAS",
    reason: "listo",
    inks: [ink({ name: "rojo", r: 200, g: 20, b: 20, fine: true })],
    fabric: "OSCURA",
    widthCm: 40,
    heightCm: 15,
  });
  assert.match(wide.blade, /punta fina/);
  assert.match(wide.speed, /lenta/);
  assert.match(wide.tool, /Plotter de corte/);

  const simple = planVinyl({
    kind: "PLANAS",
    reason: "listo",
    inks: [ink({ name: "amarillo", r: 240, g: 210, b: 20 })],
    fabric: "CLARA",
    widthCm: 15,
    heightCm: 10,
  });
  assert.match(simple.blade, /estándar/);
  assert.match(simple.speed, /media/);
  assert.match(simple.tool, /Cricut/);
  assert.match(simple.vinyl, /delgado/);
});

test("un PNG grande se comprime sin quedarse esperando", async () => {
  const width = 400;
  const height = 300;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(180);
  const png = await Promise.race([
    encodePng(width, height, data),
    new Promise<Uint8Array>((_, reject) => setTimeout(() => reject(new Error("el PNG no terminó")), 8000)),
  ]);
  assert.equal(png[0], 137);
  assert.equal(png[1], 80);
});

test("la sublimación espeja el diseño y lo pasa a la gama de cuatricromía", () => {
  const buffer = solid(4, 2);
  fill(buffer, 0, 0, 2, 2, [255, 0, 0, 255]);
  const image = sublimationImage(buffer);
  assert.equal(image.data[0], 255);
  assert.equal(image.data[1], 255);
  assert.equal(image.data[2], 255);
  const right = (4 - 1) * 4;
  assert.equal(image.data[right], 236);
  assert.equal(image.data[right + 1], 0);
  assert.equal(image.data[right + 2], 0);
  const blue = printedRgb(0, 0, 255);
  assert.ok(blue.b < 200);
  assert.ok(blue.b > 80);
});

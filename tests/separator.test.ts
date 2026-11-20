import assert from "node:assert/strict";
import test from "node:test";
import { readPsd } from "ag-psd";
import { analyzePixels } from "../lib/separator/analyze";
import { buildFilms, buildPreview, erode, marginPx } from "../lib/separator/films";
import { halftoneCell, screenDot } from "../lib/separator/halftone";
import { artOrientationCopy, artProcessSlugs } from "../lib/separator/orient";
import { encodePng } from "../lib/separator/png";
import { encodePsd } from "../lib/separator/psd";
import { buildRecipe } from "../lib/separator/recipe";
import { BACKGROUND, type PixelBuffer } from "../lib/separator/types";
import { zipFileName, zipStore } from "../lib/separator/zip";

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

test("un logo de tres colores sólidos se separa en tres tintas", () => {
  const buffer = solid(30, 20);
  fill(buffer, 0, 0, 10, 20, [250, 220, 0, 255]);
  fill(buffer, 10, 0, 20, 20, [210, 30, 30, 255]);
  fill(buffer, 20, 0, 30, 20, [8, 8, 8, 255]);

  const analysis = analyzePixels(buffer, { dpi: 150 });
  assert.equal(analysis.kind, "PLANAS");
  assert.equal(analysis.canExport, true);
  assert.equal(analysis.inks.length, 3);
  assert.deepEqual(
    analysis.inks.map((ink) => ink.name).sort(),
    ["amarillo", "negro", "rojo"],
  );
});

test("en tela oscura la base va primero y el negro al final", () => {
  const buffer = solid(30, 20);
  fill(buffer, 0, 0, 10, 20, [250, 220, 0, 255]);
  fill(buffer, 10, 0, 20, 20, [210, 30, 30, 255]);
  fill(buffer, 20, 0, 30, 20, [8, 8, 8, 255]);
  const analysis = analyzePixels(buffer);
  const dark = buildRecipe(analysis.inks, "OSCURA");
  assert.deepEqual(
    dark.map((step) => step.name),
    ["Base blanca", "Flash", "amarillo", "rojo", "negro"],
  );
  assert.equal(dark[0].mesh, "43–48 hilos/cm");
  assert.equal(dark[0].passes, 2);
  assert.equal(dark[2].passes, 1);

  const light = buildRecipe(analysis.inks, "CLARA");
  assert.equal(light.some((step) => step.kind === "base"), false);
  assert.deepEqual(
    light.map((step) => step.name),
    ["amarillo", "rojo", "negro"],
  );
});

test("un degradado largo no produce capas", () => {
  const buffer = solid(64, 8);
  for (let x = 0; x < 64; x += 1) {
    const red = Math.round(255 - (x / 63) * 255);
    const blue = Math.round((x / 63) * 255);
    fill(buffer, x, 0, x + 1, 8, [red, 0, blue, 255]);
  }
  const analysis = analyzePixels(buffer);
  assert.equal(analysis.kind, "NO_ENTRA");
  assert.equal(analysis.canExport, false);
  assert.equal(analysis.inks.length, 0);
  assert.match(analysis.reason, /foto|degradado/i);
});

test("más de seis tintas se separa en cuatricromía", () => {
  const buffer = solid(70, 10);
  const colors: [number, number, number, number][] = [
    [220, 30, 30, 255],
    [250, 210, 0, 255],
    [20, 90, 200, 255],
    [20, 150, 70, 255],
    [140, 40, 180, 255],
    [250, 120, 20, 255],
    [8, 8, 8, 255],
  ];
  colors.forEach((color, index) => fill(buffer, index * 10, 0, index * 10 + 10, 10, color));
  const analysis = analyzePixels(buffer);
  assert.equal(analysis.kind, "CMYK");
  assert.equal(analysis.canExport, true);
  assert.deepEqual(
    analysis.inks.map((ink) => ink.slug),
    ["amarillo", "magenta", "cian", "negro"],
  );

  const recipe = buildRecipe(analysis.inks, "OSCURA", undefined, "cmyk");
  assert.deepEqual(
    recipe.map((step) => step.name),
    ["Base blanca", "Flash", "amarillo", "magenta", "cian", "negro"],
  );

  const { films } = buildFilms({
    assignment: analysis.assignment,
    width: buffer.width,
    height: buffer.height,
    inks: analysis.inks,
    fabric: "CLARA",
    dpi: 150,
    chokeMm: 0,
    pixels: buffer.data,
    process: "cmyk",
  });
  assert.deepEqual(
    films.map((film) => film.fileName),
    ["01-amarillo.png", "02-magenta.png", "03-cian.png", "04-negro.png"],
  );
  const margin = marginPx(150);
  const yellowShare = inkShare(films[0], 20, 0, 30, 10, margin);
  const cyanShare = inkShare(films[2], 20, 0, 30, 10, margin);
  assert.ok(yellowShare < 0.05);
  assert.ok(cyanShare > 0.6);
});

test("una tinta al 50 % sale en trama de semitonos, no en gris", () => {
  const width = 48;
  const height = 48;
  const buffer = solid(width, height);
  fill(buffer, 4, 4, 44, 44, [128, 255, 255, 255]);
  const assignment = new Uint16Array(width * height).fill(BACKGROUND);
  for (let y = 4; y < 44; y += 1) {
    for (let x = 4; x < 44; x += 1) assignment[y * width + x] = 0;
  }
  const ink = { index: 0, name: "cian", slug: "cian", r: 0, g: 174, b: 239, pixels: 1, fine: false };
  const { films } = buildFilms({
    assignment,
    width,
    height,
    inks: [ink],
    fabric: "CLARA",
    dpi: 150,
    chokeMm: 0,
    pixels: buffer.data,
    process: "cmyk",
  });
  const margin = marginPx(150);
  const share = inkShare(films[0], 8, 8, 40, 40, margin);
  assert.ok(share > 0.35 && share < 0.65);
  let colored = false;
  for (let y = 8; y < 40 && !colored; y += 1) {
    for (let x = 8; x < 40; x += 1) {
      const offset = ((y + margin) * films[0].width + (x + margin)) * 4;
      if (films[0].rgba[offset + 3] !== 255) continue;
      assert.ok(films[0].rgba[offset] < 40);
      assert.ok(films[0].rgba[offset + 1] > 100);
      assert.ok(films[0].rgba[offset + 2] > 150);
      colored = true;
      break;
    }
  }
  assert.equal(colored, true);
  assert.equal(films[0].blendMode, "multiply");
  const cell = halftoneCell(150);
  assert.equal(screenDot(0, 0, 0, 15, cell), false);
  assert.equal(screenDot(0, 0, 1, 15, cell), true);
  const center = screenDot(cell / 2, cell / 2, 0.5, 0, cell);
  const corner = screenDot(0, 0, 0.5, 0, cell);
  assert.equal(center, true);
  assert.equal(corner, false);
});

function inkShare(
  film: { rgba: Uint8ClampedArray; width: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  margin: number,
) {
  let ink = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const offset = ((y + margin) * film.width + (x + margin)) * 4;
      const alpha = film.rgba[offset + 3];
      assert.ok(alpha === 0 || alpha === 255);
      total += 1;
      if (alpha === 255) ink += 1;
    }
  }
  return ink / total;
}

test("la base blanca se encoge", () => {
  const mask = new Uint8Array(20 * 20);
  for (let y = 2; y < 18; y += 1) {
    for (let x = 2; x < 18; x += 1) mask[y * 20 + x] = 1;
  }
  const shrunk = erode(mask, 20, 20, 2);
  assert.equal(shrunk[2 * 20 + 2], 0);
  assert.equal(shrunk[10 * 20 + 10], 1);
  let before = 0;
  let after = 0;
  for (const value of mask) before += value;
  for (const value of shrunk) after += value;
  assert.ok(after < before);
});

test("las capas traen las mismas cruces de registro", () => {
  const buffer = solid(24, 16);
  fill(buffer, 0, 0, 12, 16, [250, 210, 0, 255]);
  fill(buffer, 12, 0, 24, 16, [20, 20, 20, 255]);
  const analysis = analyzePixels(buffer, { dpi: 150 });
  const { films } = buildFilms({
    assignment: analysis.assignment,
    width: buffer.width,
    height: buffer.height,
    inks: analysis.inks,
    fabric: "OSCURA",
    dpi: 150,
    chokeMm: 1,
  });
  assert.ok(films.length >= 3);
  const margin = marginPx(150);
  const inset = Math.round(margin / 2);
  const sample = (inset * films[0].width + inset) * 4;
  for (const film of films) {
    assert.equal(film.rgba[sample], 0);
    assert.equal(film.rgba[sample + 3], 255);
  }
  const first = films[0].rgba.slice(sample, sample + 4);
  for (const film of films.slice(1)) {
    assert.deepEqual(film.rgba.slice(sample, sample + 4), first);
  }
  assert.ok(films.some((film) => film.fileName.includes("base-blanca")));
  const yellow = films.find((film) => film.fileName.includes("amarillo"));
  assert.ok(yellow);
  const clearPixel = ((5 + margin) * yellow.width + (18 + margin)) * 4;
  assert.equal(yellow.rgba[clearPixel + 3], 0);
  const inkPixel = ((5 + margin) * yellow.width + (6 + margin)) * 4;
  assert.equal(yellow.rgba[inkPixel + 3], 255);
  assert.ok(yellow.rgba[inkPixel] > 200);
  assert.ok(yellow.rgba[inkPixel + 1] > 180);
  assert.ok(yellow.rgba[inkPixel + 2] < 40);
  void BACKGROUND;
});

test("la vista sobre tela oscura pinta la tinta y no el fondo de la película", () => {
  const buffer = solid(12, 12);
  fill(buffer, 2, 2, 10, 10, [210, 30, 30, 255]);
  const analysis = analyzePixels(buffer);
  const preview = buildPreview({
    assignment: analysis.assignment,
    width: buffer.width,
    height: buffer.height,
    inks: analysis.inks,
    fabric: "OSCURA",
    dpi: 150,
    chokeMm: 1,
    maxEdge: 12,
  });
  const center = (6 * preview.width + 6) * 4;
  assert.ok(preview.data[center] > 150);
  assert.ok(preview.data[center + 2] < 80);
});

test("el PSD abre las películas como capas de Photoshop", () => {
  const white = new Uint8ClampedArray(4 * 4 * 4);
  white.fill(255);
  const black = new Uint8ClampedArray(white);
  black[0] = 0;
  black[1] = 0;
  black[2] = 0;
  const psd = encodePsd(
    [
      { name: "Base blanca", width: 4, height: 4, rgba: white },
      { name: "negro", width: 4, height: 4, rgba: black },
    ],
    150,
  );
  assert.equal(String.fromCharCode(psd[0], psd[1], psd[2], psd[3]), "8BPS");
  const parsed = readPsd(new Uint8Array(psd).buffer, {
    skipCompositeImageData: true,
    skipThumbnail: true,
    useRawData: true,
  });
  assert.equal(parsed.width, 4);
  assert.equal(parsed.height, 4);
  assert.deepEqual(
    parsed.children?.map((layer) => layer.name),
    ["negro", "Base blanca"],
  );
  assert.equal(parsed.imageResources?.resolutionInfo?.horizontalResolution, 150);
  const top = parsed.children?.[0];
  assert.equal(top?.bottom, 4);
  assert.ok((top?.rawData?.channels.find((channel) => channel.id === 0)?.data?.length ?? 0) > 0);
});

test("el archivo de capas es un ZIP con la receta y un PNG", async () => {
  const png = await encodePng(1, 1, new Uint8ClampedArray([0, 0, 0, 255]));
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const zip = zipStore([
    { name: "receta.txt", data: new TextEncoder().encode("Receta de impresión") },
    { name: "01-rojo.png", data: png },
  ]);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  const text = new TextDecoder().decode(zip);
  assert.match(text, /receta\.txt/);
  assert.match(text, /01-rojo\.png/);
});

test("el ZIP se llama igual que el archivo de entrada", () => {
  assert.equal(zipFileName("nike.png"), "nike.zip");
  assert.equal(zipFileName("logo-tintas.svg"), "logo-tintas.zip");
  assert.equal(zipFileName("mi.logo.pdf"), "mi.logo.zip");
  assert.equal(zipFileName("  "), "diseno.zip");
});

test("una foto orienta a DTF o DTG y unas tintas planas a serigrafía", () => {
  assert.deepEqual(artProcessSlugs("NO_ENTRA"), ["dtf", "dtg"]);
  assert.deepEqual(artProcessSlugs("PLANAS"), ["serigrafia"]);
  assert.deepEqual(artProcessSlugs("CMYK"), ["serigrafia"]);
  const copy = artOrientationCopy({ kind: "PLANAS", inkCount: 3, reason: "", fabric: "OSCURA" });
  assert.match(copy.explanation, /serigrafía/);
  assert.match(copy.explanation, /base blanca/);
  assert.doesNotMatch(`${copy.title} ${copy.explanation}`, /\$\d/);
});

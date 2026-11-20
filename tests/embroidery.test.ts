import assert from "node:assert/strict";
import test from "node:test";
import { analyzePixels } from "../lib/separator/analyze";
import { buildEmbroidery, decodeDst, decodeDstRecord, encodeDstRecord } from "../lib/separator/embroidery";
import { BACKGROUND, type PixelBuffer } from "../lib/separator/types";

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

test("cada desplazamiento del DST se lee igual que se escribió", () => {
  for (let value = -121; value <= 121; value += 1) {
    const bytes = encodeDstRecord({ dx: value, dy: -value, kind: "stitch" });
    const decoded = decodeDstRecord(bytes[0], bytes[1], bytes[2]);
    assert.equal(decoded.dx, value);
    assert.equal(decoded.dy, -value);
    assert.equal(decoded.kind, "stitch");
  }
  const jump = encodeDstRecord({ dx: 81, dy: 0, kind: "jump" });
  assert.equal(decodeDstRecord(jump[0], jump[1], jump[2]).kind, "jump");
  const color = encodeDstRecord({ dx: 0, dy: 0, kind: "color" });
  assert.equal(decodeDstRecord(color[0], color[1], color[2]).kind, "color");
  const end = encodeDstRecord({ dx: 0, dy: 0, kind: "end" });
  assert.deepEqual(end, [0, 0, 0xf3]);
});

test("un diseño de colores sólidos sale en DST con el orden y los parámetros", () => {
  const buffer = solid(40, 20);
  fill(buffer, 0, 0, 40, 20, [255, 255, 255, 255]);
  fill(buffer, 2, 2, 24, 18, [240, 210, 20, 255]);
  fill(buffer, 26, 6, 36, 14, [20, 20, 20, 255]);
  const analysis = analyzePixels(buffer, { keepSpots: true, solidFor: "bordado" });
  const guide = buildEmbroidery({
    kind: analysis.kind,
    reason: analysis.reason,
    inks: analysis.inks,
    assignment: analysis.assignment,
    width: buffer.width,
    height: buffer.height,
    widthCm: 4,
    heightCm: 2,
    fabric: "OSCURA",
  });
  assert.equal(guide.allowed, true);
  assert.deepEqual(
    guide.order.map((ink) => ink.name),
    ["amarillo", "negro"],
  );
  assert.match(guide.needle, /75\/11/);
  assert.match(guide.thread, /poliéster/);
  assert.match(guide.stabilizer, /cortable/);
  assert.match(guide.speed, /700 a 850/);
  assert.match(guide.tension, /bobina oscura/);
  assert.match(guide.hoop, /10 × 10/);
  assert.match(guide.text, /diseno\.dst/);

  const dst = guide.dst ?? new Uint8Array();
  assert.equal(dst.length > 512, true);
  assert.equal(dst[511], 0x1a);
  assert.equal(String.fromCharCode(...dst.slice(0, 3)), "LA:");
  const records = decodeDst(dst);
  const sewn = records.filter((record) => record.kind === "stitch").length;
  const jumps = records.filter((record) => record.kind === "jump").length;
  assert.ok(sewn > jumps, `el relleno quedó en saltos: ${sewn} puntadas y ${jumps} saltos`);
  assert.equal(records.at(-1)?.kind, "end");
  assert.equal(records.filter((record) => record.kind === "color").length, 1);
  let x = 0;
  let y = 0;
  for (const record of records) {
    if (record.kind === "end") continue;
    x += record.dx;
    y += record.dy;
    assert.ok(Math.abs(x) < 250, `x fuera del diseño: ${x}`);
    assert.ok(Math.abs(y) < 150, `y fuera del diseño: ${y}`);
  }
});

test("una foto no se puede bordar y la pantalla dice por qué", () => {
  const buffer = solid(64, 8);
  for (let x = 0; x < 64; x += 1) {
    fill(buffer, x, 0, x + 1, 8, [Math.round(255 - (x / 63) * 255), 0, Math.round((x / 63) * 255), 255]);
  }
  const analysis = analyzePixels(buffer, { keepSpots: true, solidFor: "bordado" });
  const guide = buildEmbroidery({
    kind: analysis.kind,
    reason: analysis.reason,
    inks: analysis.inks,
    assignment: new Uint16Array(buffer.width * buffer.height).fill(BACKGROUND),
    width: buffer.width,
    height: buffer.height,
    widthCm: 6,
    heightCm: 2,
    fabric: "CLARA",
  });
  assert.equal(analysis.kind, "NO_ENTRA");
  assert.equal(guide.allowed, false);
  assert.equal(guide.dst, undefined);
  assert.match(guide.reason, /bordado/i);
  assert.match(guide.reason, /aguja/i);
  assert.match(guide.reason, /foto|degradado/i);
});

import { hexOf, isBlackInk } from "@/lib/separator/color";
import type { Ink, SeparationKind } from "@/lib/separator/types";

const CELL_MM = 0.4;
const MAX_DELTA = 121;
const FILL_STITCH_MM = 4;
const FINE_STITCH_MM = 2.5;
const STROKE_STITCH_MM = 1.8;
const UNDERLAY_STITCH_MM = 7;

type Point = { x: number; y: number; jump: boolean };
type RecordKind = "stitch" | "jump" | "color" | "end";
type DstRecord = { dx: number; dy: number; kind: RecordKind };

export type EmbroideryGuide = {
  allowed: boolean;
  reason: string;
  order: { name: string; hex: string }[];
  stitches: string;
  density: string;
  underlay: string;
  needle: string;
  thread: string;
  stabilizer: string;
  hoop: string;
  speed: string;
  tension: string;
  dst?: Uint8Array;
  text: string;
};

export function buildEmbroidery(input: {
  kind: SeparationKind;
  reason: string;
  inks: Ink[];
  assignment: Uint16Array;
  width: number;
  height: number;
  widthCm: number;
  heightCm: number;
  fabric: "CLARA" | "OSCURA";
}): EmbroideryGuide {
  if (input.kind === "NO_ENTRA" || input.inks.length === 0) return rejected(input.reason);

  const ordered = [...input.inks].sort((a, b) => {
    if (isBlackInk(a) !== isBlackInk(b)) return isBlackInk(a) ? 1 : -1;
    return b.pixels - a.pixels;
  });
  const grid = makeGrid(input.widthCm, input.heightCm);
  const fine = ordered.some((ink) => ink.fine);
  const records: DstRecord[] = [];
  let strokes = 0;
  let fills = 0;
  let cursor = { x: 0, y: 0 };
  let started = false;

  for (const ink of ordered) {
    const mask = colorMask(input.assignment, ink.index, input.width, input.height, grid);
    const sewn = sewColor(mask, grid, fine);
    if (sewn.points.length === 0) continue;
    if (started) records.push({ dx: 0, dy: 0, kind: "color" });
    started = true;
    if (sewn.stroke) strokes += 1;
    else fills += 1;
    for (const point of sewn.points) {
      const dx = point.x - cursor.x;
      const dy = point.y - cursor.y;
      const kind: RecordKind = records.length === 0 || point.jump ? "jump" : "stitch";
      pushMove(records, dx, dy, kind);
      cursor = point;
    }
  }

  if (!started) {
    return rejected("El diseño quedó demasiado chico para una puntada. Súbele el tamaño e inténtalo de nuevo.");
  }

  const guide = describe({
    reason: input.reason,
    order: ordered.map((ink) => ({ name: ink.name, hex: hexOf(ink) })),
    stitches: records.filter((record) => record.kind === "stitch").length,
    jumps: records.filter((record) => record.kind === "jump").length,
    changes: records.filter((record) => record.kind === "color").length,
    rowMm: grid.cellMmY,
    fillMm: fine ? FINE_STITCH_MM : FILL_STITCH_MM,
    hasFill: fills > 0,
    hasStroke: strokes > 0,
    fine,
    fabric: input.fabric,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
  });
  records.push({ dx: 0, dy: 0, kind: "end" });
  guide.dst = encodeDst(records, "TEXTILENLACE");
  guide.text = embroideryText(guide, { widthCm: input.widthCm, heightCm: input.heightCm });
  return guide;
}

export function decodeDst(bytes: Uint8Array): DstRecord[] {
  const records: DstRecord[] = [];
  for (let offset = 512; offset + 2 < bytes.length; offset += 3) {
    const decoded = decodeDstRecord(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
    records.push(decoded);
    if (decoded.kind === "end") break;
  }
  return records;
}

function rejected(reason: string): EmbroideryGuide {
  return {
    allowed: false,
    reason,
    order: [],
    stitches: "",
    density: "",
    underlay: "",
    needle: "",
    thread: "",
    stabilizer: "",
    hoop: "",
    speed: "",
    tension: "",
    text: "",
  };
}

function describe(input: {
  reason: string;
  order: { name: string; hex: string }[];
  stitches: number;
  jumps: number;
  changes: number;
  rowMm: number;
  fillMm: number;
  hasFill: boolean;
  hasStroke: boolean;
  fine: boolean;
  fabric: "CLARA" | "OSCURA";
  widthCm: number;
  heightCm: number;
}): EmbroideryGuide {
  return {
    allowed: true,
    reason: input.reason,
    order: input.order,
    stitches: `${input.stitches} puntadas de costura, ${input.jumps} saltos y ${input.changes} cambios de color.`,
    density: `Hileras cada ${input.rowMm.toFixed(2)} mm. ${input.hasFill ? `El relleno usa puntadas de ${input.fillMm.toFixed(1)} mm.` : "No hay rellenos grandes."} ${input.hasStroke ? `Los trazos finos usan puntadas de ${STROKE_STITCH_MM.toFixed(1)} mm.` : ""}`.trim(),
    underlay: input.hasFill
      ? "Los rellenos llevan una base de puntadas de 7 mm, metida unos 0.4 mm hacia adentro, y después el relleno. El relleno crece unos 0.4 mm para compensar el encogimiento de la tela de punto. Los trazos finos no llevan base, para no ensancharlos."
      : "El diseño es un trazo fino: no lleva base por debajo, para no ensancharlo. Se cose con puntadas cortas.",
    needle: input.fine
      ? "Aguja de punta de bola 65/9 o 70/10 en tela de punto. En tela plana, aguja aguda 70/10."
      : "Aguja de punta de bola 75/11 en tela de punto. En tela plana, aguja aguda 75/11.",
    thread: "Hilo de poliéster para bordar, título 40, un cono por color. Los conos van en el orden de la lista.",
    stabilizer:
      "En playera o tela de punto: una capa de entretela cortable de peso medio, por el revés. Si el relleno es grande, pon dos capas. En tela plana y firme: entretela que se rasga.",
    hoop: hoopFor(input.widthCm, input.heightCm),
    speed: input.fine
      ? "500 a 650 puntadas por minuto. El detalle fino se abre si la máquina corre más."
      : "700 a 850 puntadas por minuto. Si el hilo se rompe, bájala.",
    tension:
      input.fabric === "OSCURA"
        ? "Tensión media: el hilo de arriba no se ve en el revés y el de la bobina no se ve en el frente. En tela oscura usa bobina oscura."
        : "Tensión media: el hilo de arriba no se ve en el revés y el de la bobina no se ve en el frente. En tela clara usa bobina clara.",
    text: "",
  };
}

export function embroideryText(guide: EmbroideryGuide, size: { widthCm: number; heightCm: number }) {
  const order = guide.order.map((ink, index) => `${index + 1}. ${ink.name}`).join("\n");
  return [
    "Bordado a máquina",
    `Tamaño: ${size.widthCm} × ${size.heightCm} cm.`,
    "El archivo diseno.dst es formato Tajima. Lo lee la mayoría de las máquinas de bordar y el programa de la máquina.",
    "El diseño se cose de frente, sin espejo. El primer color es el área más grande y queda debajo. El negro, si lo hay, va al final.",
    "",
    "Orden de los hilos:",
    order,
    "",
    `Puntadas: ${guide.stitches}`,
    `Densidad: ${guide.density}`,
    `Base: ${guide.underlay}`,
    `Aguja: ${guide.needle}`,
    `Hilo: ${guide.thread}`,
    `Entretela: ${guide.stabilizer}`,
    `Aro: ${guide.hoop}`,
    `Velocidad: ${guide.speed}`,
    `Tensión: ${guide.tension}`,
    "",
    "Cose un retazo de la misma tela antes de la prenda. Si la entretela indica otra capa, sigue esa.",
  ].join("\n");
}

function hoopFor(widthCm: number, heightCm: number) {
  const needW = widthCm + 2;
  const needH = heightCm + 2;
  const hoops: Array<[number, number]> = [
    [10, 10],
    [12, 12],
    [18, 13],
    [20, 20],
    [30, 20],
    [36, 30],
  ];
  const fit = hoops.find(([width, height]) => (width >= needW && height >= needH) || (height >= needW && width >= needH));
  if (!fit) return `El diseño pide más de ${needW.toFixed(0)} × ${needH.toFixed(0)} cm. Usa un bastidor grande o divídelo.`;
  return `Aro de ${fit[0]} × ${fit[1]} cm. Tiene que cubrir el diseño más 2 cm de margen.`;
}

function makeGrid(widthCm: number, heightCm: number) {
  const cols = Math.min(900, Math.max(1, Math.round((widthCm * 10) / CELL_MM)));
  const rows = Math.min(900, Math.max(1, Math.round((heightCm * 10) / CELL_MM)));
  return { cols, rows, cellMmX: (widthCm * 10) / cols, cellMmY: (heightCm * 10) / rows, widthCm, heightCm };
}

function colorMask(assignment: Uint16Array, inkIndex: number, width: number, height: number, grid: ReturnType<typeof makeGrid>) {
  const mask = new Uint8Array(grid.cols * grid.rows);
  for (let y = 0; y < grid.rows; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor(((y + 0.5) * height) / grid.rows));
    for (let x = 0; x < grid.cols; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor(((x + 0.5) * width) / grid.cols));
      if (assignment[sourceY * width + sourceX] === inkIndex) mask[y * grid.cols + x] = 1;
    }
  }
  return mask;
}

function sewColor(mask: Uint8Array, grid: ReturnType<typeof makeGrid>, fine: boolean) {
  const stroke = medianRun(mask, grid.cols, grid.rows) <= 4;
  const source = stroke ? mask : dilate(mask, grid.cols, grid.rows);
  const points: Point[] = [];
  if (!stroke) pushRows(points, erode(source, grid.cols, grid.rows), grid, UNDERLAY_STITCH_MM, 3, 1);
  pushRows(points, source, grid, stroke ? STROKE_STITCH_MM : fine ? FINE_STITCH_MM : FILL_STITCH_MM, 1, 0);
  return { points, stroke };
}

function pushRows(
  points: Point[],
  mask: Uint8Array,
  grid: ReturnType<typeof makeGrid>,
  stitchMm: number,
  every: number,
  inset: number,
) {
  const step = Math.max(1, Math.round(stitchMm / grid.cellMmX));
  let forward = true;
  for (let y = 0; y < grid.rows; y += every) {
    const runs = runsOnRow(mask, grid.cols, y)
      .map((run) => ({ start: run.start + inset, end: run.end - inset }))
      .filter((run) => run.end >= run.start);
    const ordered = forward ? runs : [...runs].reverse();
    for (const run of ordered) {
      const samples = sampleRun(run.start, run.end, step);
      const sequence = forward ? samples : [...samples].reverse();
      sequence.forEach((x, index) => {
        const point = cellPoint(x, y, grid, false);
        const previous = points[points.length - 1];
        const gap = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
        point.jump = index === 0 && gap > 80;
        points.push(point);
      });
    }
    if (ordered.length > 0) forward = !forward;
  }
}

function sampleRun(start: number, end: number, step: number) {
  const samples = [start];
  for (let x = start + step; x < end; x += step) samples.push(x);
  if (samples[samples.length - 1] !== end) samples.push(end);
  return samples;
}

function cellPoint(x: number, y: number, grid: ReturnType<typeof makeGrid>, jump: boolean): Point {
  const mmX = (x + 0.5) * grid.cellMmX - (grid.widthCm * 10) / 2;
  const mmY = (grid.heightCm * 10) / 2 - (y + 0.5) * grid.cellMmY;
  return { x: Math.round(mmX * 10), y: Math.round(mmY * 10), jump };
}

function runsOnRow(mask: Uint8Array, cols: number, y: number) {
  const runs: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let x = 0; x <= cols; x += 1) {
    const on = x < cols && mask[y * cols + x] === 1;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      runs.push({ start, end: x - 1 });
      start = -1;
    }
  }
  return runs;
}

function medianRun(mask: Uint8Array, cols: number, rows: number) {
  const lengths: number[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (const run of runsOnRow(mask, cols, y)) lengths.push(run.end - run.start + 1);
  }
  if (lengths.length === 0) return 0;
  lengths.sort((a, b) => a - b);
  return lengths[Math.floor(lengths.length / 2)];
}

function dilate(mask: Uint8Array, cols: number, rows: number) {
  const out = new Uint8Array(mask);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (mask[y * cols + x] !== 1) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out[ny * cols + nx] = 1;
      }
    }
  }
  return out;
}

function erode(mask: Uint8Array, cols: number, rows: number) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (mask[y * cols + x] !== 1) continue;
      const inside =
        x > 0 &&
        y > 0 &&
        x + 1 < cols &&
        y + 1 < rows &&
        mask[y * cols + x - 1] === 1 &&
        mask[y * cols + x + 1] === 1 &&
        mask[(y - 1) * cols + x] === 1 &&
        mask[(y + 1) * cols + x] === 1;
      if (inside) out[y * cols + x] = 1;
    }
  }
  return out;
}

function pushMove(records: DstRecord[], dx: number, dy: number, kind: "stitch" | "jump") {
  let x = dx;
  let y = dy;
  if (x === 0 && y === 0) return;
  do {
    const sx = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, x));
    const sy = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, y));
    records.push({ dx: sx, dy: sy, kind });
    x -= sx;
    y -= sy;
  } while (x !== 0 || y !== 0);
}

function encodeDst(records: DstRecord[], name: string) {
  let x = 0;
  let y = 0;
  let maxX = 0;
  let minX = 0;
  let maxY = 0;
  let minY = 0;
  const body: number[] = [];
  for (const record of records) {
    if (record.kind !== "end") {
      x += record.dx;
      y += record.dy;
      maxX = Math.max(maxX, x);
      minX = Math.min(minX, x);
      maxY = Math.max(maxY, y);
      minY = Math.min(minY, y);
    }
    body.push(...encodeDstRecord(record));
  }
  const counted = records.filter((record) => record.kind !== "end").length;
  const changes = records.filter((record) => record.kind === "color").length;
  const header = dstHeader({ name, stitches: counted, changes, maxX, minX, maxY, minY });
  const bytes = new Uint8Array(header.length + body.length);
  bytes.set(header, 0);
  bytes.set(body, header.length);
  return bytes;
}

function dstHeader(input: {
  name: string;
  stitches: number;
  changes: number;
  maxX: number;
  minX: number;
  maxY: number;
  minY: number;
}) {
  const label = input.name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 16)
    .padEnd(16, " ");
  const lines = [
    `LA:${label}`,
    `ST:${String(input.stitches).padStart(7, " ")}`,
    `CO:${String(input.changes).padStart(3, " ")}`,
    `+X:${String(input.maxX).padStart(5, " ")}`,
    `-X:${String(Math.abs(input.minX)).padStart(5, " ")}`,
    `+Y:${String(input.maxY).padStart(5, " ")}`,
    `-Y:${String(Math.abs(input.minY)).padStart(5, " ")}`,
    "AX:+    0",
    "AY:+    0",
    "MX:+    0",
    "MY:+    0",
    "PD:******",
  ];
  const bytes = new Uint8Array(512);
  bytes.fill(0x20);
  let offset = 0;
  for (const line of lines) {
    for (const char of line) bytes[offset++] = char.charCodeAt(0);
    bytes[offset++] = 0x0d;
  }
  bytes[511] = 0x1a;
  return bytes;
}

export function encodeDstRecord(record: DstRecord) {
  const bytes = [0, 0, 0];
  // The file stores Y in the opposite direction of the design's Y-up axis.
  writeAxis(bytes, record.dx, "x");
  writeAxis(bytes, -record.dy, "y");
  if (record.kind === "end") bytes[2] |= 0xf3;
  else if (record.kind === "color") bytes[2] |= 0xc3;
  else if (record.kind === "jump") bytes[2] |= 0x83;
  return bytes;
}

function writeAxis(bytes: number[], value: number, axis: "x" | "y") {
  const digits = balancedDigits(value);
  const magnitudes = [1, 3, 9, 27, 81];
  digits.forEach((digit, index) => {
    if (digit === 0) return;
    const key = `${axis}${digit > 0 ? "+" : "-"}${magnitudes[index]}`;
    const [byteIndex, mask] = BIT[key];
    bytes[byteIndex] |= mask;
  });
}

const BIT: Record<string, [number, number]> = {
  "x+1": [0, 0x01],
  "x-1": [0, 0x02],
  "y+1": [0, 0x04],
  "y-1": [0, 0x08],
  "x+9": [0, 0x10],
  "x-9": [0, 0x20],
  "y+9": [0, 0x40],
  "y-9": [0, 0x80],
  "x+3": [1, 0x01],
  "x-3": [1, 0x02],
  "y+3": [1, 0x04],
  "y-3": [1, 0x08],
  "x+27": [1, 0x10],
  "x-27": [1, 0x20],
  "y+27": [1, 0x40],
  "y-27": [1, 0x80],
  "x+81": [2, 0x04],
  "x-81": [2, 0x08],
  "y+81": [2, 0x10],
  "y-81": [2, 0x20],
};

function balancedDigits(value: number): Array<-1 | 0 | 1> {
  const digits: Array<-1 | 0 | 1> = [];
  let remainder = value;
  for (let power = 0; power < 5; power += 1) {
    const mod = ((remainder % 3) + 3) % 3;
    const floor = Math.floor(remainder / 3);
    if (mod === 2) {
      digits.push(-1);
      remainder = floor + 1;
    } else {
      digits.push(mod === 1 ? 1 : 0);
      remainder = floor;
    }
  }
  return digits;
}

export function decodeDstRecord(b0: number, b1: number, b2: number): DstRecord {
  let x = 0;
  let y = 0;
  if (b0 & 0x01) x += 1;
  if (b0 & 0x02) x -= 1;
  if (b0 & 0x04) y += 1;
  if (b0 & 0x08) y -= 1;
  if (b0 & 0x10) x += 9;
  if (b0 & 0x20) x -= 9;
  if (b0 & 0x40) y += 9;
  if (b0 & 0x80) y -= 9;
  if (b1 & 0x01) x += 3;
  if (b1 & 0x02) x -= 3;
  if (b1 & 0x04) y += 3;
  if (b1 & 0x08) y -= 3;
  if (b1 & 0x10) x += 27;
  if (b1 & 0x20) x -= 27;
  if (b1 & 0x40) y += 27;
  if (b1 & 0x80) y -= 27;
  if (b2 & 0x04) x += 81;
  if (b2 & 0x08) x -= 81;
  if (b2 & 0x10) y += 81;
  if (b2 & 0x20) y -= 81;
  return { dx: x, dy: -y, kind: recordKind(b2) };
}

function recordKind(b2: number): RecordKind {
  if ((b2 & 0xf3) === 0xf3) return "end";
  if ((b2 & 0xc3) === 0xc3) return "color";
  if ((b2 & 0x83) === 0x83) return "jump";
  return "stitch";
}

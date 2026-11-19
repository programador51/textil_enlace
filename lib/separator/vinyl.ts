import { hexOf, sortInksForPrint } from "@/lib/separator/color";
import type { Ink, SeparationKind } from "@/lib/separator/types";

type Point = { x: number; y: number };
type Edge = "t" | "r" | "b" | "l";

const TRACE_EDGE = 900;

const CASES: Array<Array<[Edge, Edge]>> = [
  [],
  [["l", "t"]],
  [["t", "r"]],
  [["l", "r"]],
  [["r", "b"]],
  [
    ["l", "t"],
    ["r", "b"],
  ],
  [["t", "b"]],
  [["l", "b"]],
  [["b", "l"]],
  [["t", "b"]],
  [
    ["t", "r"],
    ["b", "l"],
  ],
  [["r", "b"]],
  [["r", "l"]],
  [["t", "r"]],
  [["l", "t"]],
  [],
];

export type VinylPlan = {
  allowed: boolean;
  reason: string;
  order: { name: string; hex: string }[];
  blade: string;
  speed: string;
  tool: string;
  vinyl: string;
  iron: string;
  mirror: string;
};

export function planVinyl(input: {
  kind: SeparationKind;
  reason: string;
  inks: Ink[];
  fabric: "CLARA" | "OSCURA";
  widthCm: number;
  heightCm: number;
}): VinylPlan {
  if (input.kind === "NO_ENTRA" || input.inks.length === 0) {
    return {
      allowed: false,
      reason: input.reason,
      order: [],
      blade: "",
      speed: "",
      tool: "",
      vinyl: "",
      iron: "",
      mirror: "",
    };
  }

  const ordered = sortInksForPrint(input.inks);
  const fine = ordered.some((ink) => ink.fine);
  const wide = Math.max(input.widthCm, input.heightCm) > 30;
  const hasWhite = ordered.some((ink) => ink.name.startsWith("blanco") || (ink.r > 240 && ink.g > 240 && ink.b > 240));

  return {
    allowed: true,
    reason: input.reason,
    order: ordered.map((ink) => ({ name: ink.name, hex: hexOf(ink) })),
    blade: fine
      ? "Navaja de punta fina, 45°, con poca profundidad. En un recorte de prueba la navaja debe marcar el vinil y dejar el soporte entero."
      : "Navaja estándar de 45°, con poca profundidad. En un recorte de prueba debe cortar el vinil y dejar el soporte entero.",
    speed: fine
      ? "Velocidad lenta: 2 a 4 en Cricut, o cerca de 3 cm/s en el plotter."
      : "Velocidad media: 5 a 6 en Cricut, o de 8 a 12 cm/s en el plotter.",
    tool: chooseTool(wide, fine),
    vinyl: chooseVinyl(input.fabric, fine, hasWhite),
    iron: "Sin vapor y con presión firme. En vinil textil de poliuretano estándar: 12 a 15 segundos. Pela el soporte cuando entibie. Si el rollo indica otro tiempo, usa el del rollo. Glitter y flock no usan este tiempo.",
    mirror: "El DXF está en espejo, como se corta el vinil textil para que al plancharlo el diseño quede al derecho.",
  };
}

export function vinylInstructions(plan: VinylPlan, size: { widthCm: number; heightCm: number }) {
  const order = plan.order.map((ink, index) => `${index + 1}. ${ink.name}`).join("\n");
  return [
    "Vinil textil",
    `Tamaño: ${size.widthCm} × ${size.heightCm} cm.`,
    plan.mirror,
    "",
    "Orden para planchar. La primera capa queda debajo y la última queda arriba:",
    order,
    "",
    `Navaja: ${plan.blade}`,
    `Velocidad: ${plan.speed}`,
    `Máquina: ${plan.tool}`,
    `Vinil: ${plan.vinyl}`,
    `Tiempo de plancha: ${plan.iron}`,
    "",
    "Cada color del DXF es una capa. El nombre empieza por el orden de plancha: 01 es la primera.",
  ].join("\n");
}

export function buildVinylDxf(input: {
  assignment: Uint16Array;
  width: number;
  height: number;
  inks: Ink[];
  widthCm: number;
  heightCm: number;
}) {
  const ordered = sortInksForPrint(input.inks);
  const layers = ordered.map((ink, index) => ({
    ink,
    name: layerName(index + 1, ink.slug || ink.name),
  }));
  const lines: string[] = [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$INSUNITS",
    "70",
    "4",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "TABLES",
    "0",
    "TABLE",
    "2",
    "LAYER",
    "70",
    String(layers.length + 1),
    ...layerRecord("0", 7),
  ];

  for (const layer of layers) lines.push(...layerRecord(layer.name, aciColor(layer.ink)));
  lines.push("0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES");

  for (const layer of layers) {
    const mask = inkMask(input.assignment, layer.ink.index, input.width * input.height);
    const traced = traceMask(mask, input.width, input.height);
    for (const loop of traced.loops) {
      lines.push("0", "POLYLINE", "8", layer.name, "66", "1", "70", "1");
      for (const point of loop) {
        const mm = toMillimeters(point, traced.scale, input);
        lines.push("0", "VERTEX", "8", layer.name, "10", mm.x.toFixed(3), "20", mm.y.toFixed(3));
      }
      lines.push("0", "SEQEND");
    }
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

function chooseTool(wide: boolean, fine: boolean) {
  if (wide) {
    return fine
      ? "Plotter de corte con navaja de punta fina. El diseño pasa de 30 cm y tiene detalle fino; una Cricut o una Silhouette de escritorio no cubren ese ancho."
      : "Plotter de corte. El diseño pasa de 30 cm y conviene una máquina más ancha que una Cricut o una Silhouette de escritorio.";
  }
  if (fine) {
    return "Silhouette o plotter de corte. El detalle fino pide presión baja y una navaja precisa. Una Cricut también sirve si el logo es chico y usas la navaja de punta fina.";
  }
  return "Cricut, Silhouette o plotter de corte. La forma es simple y las tres la cortan. Usa la que ya tengas.";
}

function chooseVinyl(fabric: "CLARA" | "OSCURA", fine: boolean, hasWhite: boolean) {
  const detail = fine ? " Evita glitter, flock y vinil grueso: el detalle fino se corta mal o se desprende." : "";
  if (fabric === "OSCURA" && hasWhite) {
    return `Vinil textil de poliuretano. El blanco del diseño se plancha primero y debe ser opaco. No uses vinil adhesivo de rotulación.${detail}`;
  }
  if (fabric === "OSCURA") {
    return `Vinil textil de poliuretano, opaco, para cubrir la tela oscura sin una base blanca. No uses vinil adhesivo de rotulación.${detail}`;
  }
  return `Vinil textil de poliuretano, delgado. En tela clara no hace falta una base blanca. No uses vinil adhesivo de rotulación.${detail}`;
}

function layerName(order: number, slug: string) {
  const clean = slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${String(order).padStart(2, "0")}-${clean || "COLOR"}`;
}

function aciColor(ink: Pick<Ink, "r" | "g" | "b">) {
  if (ink.r < 40 && ink.g < 40 && ink.b < 40) return 7;
  if (ink.r > 180 && ink.g < 80 && ink.b < 80) return 1;
  if (ink.r > 180 && ink.g > 160 && ink.b < 80) return 2;
  if (ink.g > 140 && ink.r < 80) return 3;
  if (ink.b > 140 && ink.r < 80) return 5;
  if (ink.r > 140 && ink.b > 140) return 6;
  return 7;
}

function layerRecord(name: string, color: number) {
  return ["0", "LAYER", "2", name, "70", "0", "62", String(color), "6", "CONTINUOUS"];
}

function inkMask(assignment: Uint16Array, inkIndex: number, length: number) {
  const mask = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    if (assignment[index] === inkIndex) mask[index] = 1;
  }
  return mask;
}

function traceMask(mask: Uint8Array, width: number, height: number) {
  const scaled = downsample(mask, width, height);
  const loops = traceContours(scaled.mask, scaled.width, scaled.height)
    .map((loop) => simplifyClosed(loop, 0.6))
    .filter((loop) => loop.length >= 3 && Math.abs(shoelace(loop)) >= 1);
  return { loops, scale: scaled.scale };
}

function downsample(mask: Uint8Array, width: number, height: number) {
  const edge = Math.max(width, height);
  if (edge <= TRACE_EDGE) return { mask, width, height, scale: 1 };
  const nw = Math.max(1, Math.round((width * TRACE_EDGE) / edge));
  const nh = Math.max(1, Math.round((height * TRACE_EDGE) / edge));
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y += 1) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / nh));
    for (let x = 0; x < nw; x += 1) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) * width) / nw));
      out[y * nw + x] = mask[sy * width + sx];
    }
  }
  return { mask: out, width: nw, height: nh, scale: nw / width };
}

function traceContours(mask: Uint8Array, width: number, height: number) {
  const segments: Array<[Point, Point]> = [];
  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const code =
        (filled(mask, width, height, x, y) ? 1 : 0) |
        (filled(mask, width, height, x + 1, y) ? 2 : 0) |
        (filled(mask, width, height, x + 1, y + 1) ? 4 : 0) |
        (filled(mask, width, height, x, y + 1) ? 8 : 0);
      const edges = CASES[code];
      if (!edges?.length) continue;
      const mid: Record<Edge, Point> = {
        t: { x: x + 0.5, y },
        r: { x: x + 1, y: y + 0.5 },
        b: { x: x + 0.5, y: y + 1 },
        l: { x, y: y + 0.5 },
      };
      for (const [from, to] of edges) segments.push([mid[from], mid[to]]);
    }
  }
  return chain(segments);
}

function filled(mask: Uint8Array, width: number, height: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return mask[y * width + x] === 1;
}

function chain(segments: Array<[Point, Point]>) {
  const unused = new Set(segments.map((_, index) => index));
  const byPoint = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    pushPoint(byPoint, segment[0], index);
    pushPoint(byPoint, segment[1], index);
  });

  const loops: Point[][] = [];
  while (unused.size > 0) {
    const start = unused.values().next().value;
    if (start == null) break;
    unused.delete(start);
    const loop = [segments[start][0], segments[start][1]];
    let guard = 0;
    while (guard < segments.length + 2) {
      guard += 1;
      const tail = loop[loop.length - 1];
      if (loop.length > 3 && same(tail, loop[0])) {
        loop.pop();
        break;
      }
      const next = findNext(tail, byPoint, unused);
      if (next == null) break;
      unused.delete(next);
      const [from, to] = segments[next];
      loop.push(same(from, tail) ? to : from);
    }
    if (loop.length >= 4 && same(loop[0], loop[loop.length - 1])) loop.pop();
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function pushPoint(map: Map<string, number[]>, point: Point, index: number) {
  const id = `${point.x},${point.y}`;
  const list = map.get(id);
  if (list) list.push(index);
  else map.set(id, [index]);
}

function findNext(point: Point, map: Map<string, number[]>, unused: Set<number>) {
  const list = map.get(`${point.x},${point.y}`);
  if (!list) return null;
  for (const index of list) {
    if (unused.has(index)) return index;
  }
  return null;
}

function same(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function simplifyClosed(points: Point[], epsilon: number) {
  if (points.length <= 4) return points;
  const open = rdp([...points, points[0]], epsilon);
  if (open.length > 1 && same(open[0], open[open.length - 1])) open.pop();
  return open.length >= 3 ? open : points;
}

function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let max = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let cursor = 1; cursor < points.length - 1; cursor += 1) {
    const distance = pointLineDistance(points[cursor], start, end);
    if (distance > max) {
      max = distance;
      index = cursor;
    }
  }
  if (max > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function pointLineDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
}

function shoelace(points: Point[]) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index].x * next.y - next.x * points[index].y;
  }
  return area / 2;
}

function toMillimeters(
  point: Point,
  scale: number,
  input: { width: number; height: number; widthCm: number; heightCm: number },
) {
  const px = point.x / scale;
  const py = point.y / scale;
  return {
    x: ((input.width - px) * input.widthCm * 10) / input.width,
    y: ((input.height - py) * input.heightCm * 10) / input.height,
  };
}

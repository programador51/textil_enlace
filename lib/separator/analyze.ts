import { cmykInks } from "@/lib/separator/cmyk";
import { dist, nameInks } from "@/lib/separator/color";
import { BACKGROUND, MAX_INKS, type Analysis, type Ink, type PixelBuffer, type RGB, type SeparationKind } from "@/lib/separator/types";

type Cluster = RGB & { count: number; sumR: number; sumG: number; sumB: number };

const MERGE_DISTANCE = 42;
const SMALL_SHARE = 0.006;
const PALETTE_SNAP = 72;

export function analyzePixels(
  buffer: PixelBuffer,
  options?: { palette?: RGB[]; dpi?: number; fineThresholdMm?: number },
): Analysis {
  const { width, height, data } = buffer;
  const count = width * height;
  const background = detectBackground(buffer);
  const inkIndexes: number[] = [];

  for (let index = 0; index < count; index += 1) {
    if (!isInkPixel(data, index, background)) continue;
    inkIndexes.push(index);
  }

  if (inkIndexes.length === 0) {
    return emptyAnalysis(count, "No se vieron tintas. Revisa que el logo no sea del mismo color que el fondo.");
  }

  const clustered = options?.palette?.length
    ? clusterToPalette(data, inkIndexes, options.palette)
    : clusterFree(data, inkIndexes);

  if (clustered.photo) {
    return emptyAnalysis(
      count,
      "Esto se ve como una foto, un degradado largo o una acuarela. No armamos pantallas de serigrafía para ese archivo.",
    );
  }

  return finishAnalysis(buffer, inkIndexes, clustered.clusters, clustered.simplified, options);
}

export function mergeInks(analysis: Analysis, buffer: PixelBuffer, from: number, into: number, options?: { dpi?: number; fineThresholdMm?: number }) {
  if (!analysis.inks.some((ink) => ink.index === from) || !analysis.inks.some((ink) => ink.index === into) || from === into) {
    return analysis;
  }

  const assignment = analysis.assignment;
  for (let index = 0; index < assignment.length; index += 1) {
    if (assignment[index] === from) assignment[index] = into;
  }

  const survivors = analysis.inks.filter((ink) => ink.index !== from);
  return analysisFromAssignment(buffer, assignment, survivors.map((ink) => ink.index), true, options);
}

export function assignPalette(
  buffer: PixelBuffer,
  colors: { name: string; slug: string; hex: string }[],
  options?: { dpi?: number; fineThresholdMm?: number },
) {
  const palette = colors.map((color) => parseStored(color.hex));
  const analysis = analyzePixels(buffer, { ...options, palette });
  const byColor = new Map(analysis.inks.map((ink) => [hexKey(ink), ink]));
  const ordered = colors.map((color, index) => {
    const match = byColor.get(hexKey(parseStored(color.hex)));
    return {
      index,
      name: color.name,
      slug: color.slug,
      ...parseStored(color.hex),
      pixels: match?.pixels ?? 0,
      fine: match?.fine ?? false,
    } satisfies Ink;
  });

  const assignment = new Uint16Array(buffer.width * buffer.height);
  assignment.fill(BACKGROUND);
  const { data } = buffer;
  const background = detectBackground(buffer);
  for (let index = 0; index < assignment.length; index += 1) {
    if (!isInkPixel(data, index, background)) continue;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    const pixel = { r: data[index * 4], g: data[index * 4 + 1], b: data[index * 4 + 2] };
    palette.forEach((color, colorIndex) => {
      const distance = dist(pixel, color);
      if (distance < bestDist) {
        bestDist = distance;
        best = colorIndex;
      }
    });
    assignment[index] = best;
  }

  return { ...analysis, inks: ordered, assignment, canExport: ordered.length > 0 && ordered.length <= MAX_INKS };
}

function finishAnalysis(
  buffer: PixelBuffer,
  inkIndexes: number[],
  clusters: Cluster[],
  simplified: boolean,
  options?: { dpi?: number; fineThresholdMm?: number },
) {
  const means = clusters.map((cluster) => ({
    r: Math.round(cluster.sumR / cluster.count),
    g: Math.round(cluster.sumG / cluster.count),
    b: Math.round(cluster.sumB / cluster.count),
  }));
  const assignment = new Uint16Array(buffer.width * buffer.height);
  assignment.fill(BACKGROUND);
  const { data } = buffer;
  for (const index of inkIndexes) {
    const pixel = { r: data[index * 4], g: data[index * 4 + 1], b: data[index * 4 + 2] };
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    means.forEach((color, colorIndex) => {
      const distance = dist(pixel, color);
      if (distance < bestDist) {
        bestDist = distance;
        best = colorIndex;
      }
    });
    assignment[index] = best;
  }

  return analysisFromAssignment(
    buffer,
    assignment,
    means.map((_, index) => index),
    simplified,
    options,
    means,
  );
}

function analysisFromAssignment(
  buffer: PixelBuffer,
  assignment: Uint16Array,
  indexes: number[],
  simplified: boolean,
  options?: { dpi?: number; fineThresholdMm?: number },
  means?: RGB[],
) {
  const counts = new Map<number, number>();
  const sums = new Map<number, { r: number; g: number; b: number }>();
  for (let index = 0; index < assignment.length; index += 1) {
    const ink = assignment[index];
    if (ink === BACKGROUND) continue;
    counts.set(ink, (counts.get(ink) ?? 0) + 1);
    const current = sums.get(ink) ?? { r: 0, g: 0, b: 0 };
    if (!means) {
      current.r += buffer.data[index * 4];
      current.g += buffer.data[index * 4 + 1];
      current.b += buffer.data[index * 4 + 2];
      sums.set(ink, current);
    }
  }

  const colors = indexes
    .filter((index) => (counts.get(index) ?? 0) > 0)
    .map((index) => {
      if (means?.[index]) return means[index];
      const count = counts.get(index) ?? 1;
      const sum = sums.get(index) ?? { r: 0, g: 0, b: 0 };
      return { r: Math.round(sum.r / count), g: Math.round(sum.g / count), b: Math.round(sum.b / count) };
    });
  const liveIndexes = indexes.filter((index) => (counts.get(index) ?? 0) > 0);
  const named = nameInks(
    colors,
    liveIndexes.map((index) => counts.get(index) ?? 0),
  );

  const remapped = new Uint16Array(assignment.length);
  remapped.fill(BACKGROUND);
  const lookup = new Map(liveIndexes.map((oldIndex, next) => [oldIndex, next]));
  for (let index = 0; index < assignment.length; index += 1) {
    const ink = assignment[index];
    if (ink === BACKGROUND) continue;
    const next = lookup.get(ink);
    if (next != null) remapped[index] = next;
  }

  const dpi = options?.dpi ?? 150;
  const finePx = Math.max(1, Math.round(((options?.fineThresholdMm ?? 0.4) * dpi) / 25.4));
  const inks: Ink[] = named.map((ink, index) => ({
    ...ink,
    index,
    fine: isFine(remapped, buffer.width, buffer.height, index, finePx),
  }));

  const kind = kindFor(inks.length, simplified);
  if (kind === "CMYK") {
    return {
      kind,
      reason: reasonFor(kind, inks.length),
      inks: cmykInks(buffer, remapped),
      assignment: remapped,
      canExport: true,
      simplified: false,
    };
  }

  return {
    kind,
    reason: reasonFor(kind, inks.length),
    inks,
    assignment: remapped,
    canExport: kind === "PLANAS" || kind === "SIMPLIFICA",
    simplified: kind === "SIMPLIFICA",
  };
}

function kindFor(inkCount: number, simplified: boolean): SeparationKind {
  if (inkCount > MAX_INKS) return "CMYK";
  if (simplified) return "SIMPLIFICA";
  return "PLANAS";
}

function reasonFor(kind: SeparationKind, inkCount: number) {
  if (kind === "CMYK") {
    return `Se ven ${inkCount} tintas. Se separan en cuatricromía con trama de semitonos: cian, magenta, amarillo y negro.`;
  }
  if (kind === "SIMPLIFICA") {
    return `Había tonos de borde o muy parecidos. Quedaron ${inkCount} tintas. Revisa las capas antes de revelar.`;
  }
  return inkCount === 1 ? "Se ve una tinta sólida." : `Se ven ${inkCount} tintas sólidas.`;
}

function emptyAnalysis(pixels: number, reason: string): Analysis {
  return {
    kind: "NO_ENTRA",
    reason,
    inks: [],
    assignment: new Uint16Array(pixels).fill(BACKGROUND),
    canExport: false,
    simplified: false,
  };
}

type Background =
  | { mode: "alpha" }
  | { mode: "color"; color: RGB }
  | { mode: "none" };

function detectBackground(buffer: PixelBuffer): Background {
  const { width, height, data } = buffer;
  const count = width * height;
  let transparent = 0;
  for (let index = 0; index < count; index += 1) {
    if (data[index * 4 + 3] < 16) transparent += 1;
  }
  if (transparent / count > 0.02) return { mode: "alpha" };

  const buckets = new Map<number, { color: RGB; count: number }>();
  const visit = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 16) return;
    const key = ((data[offset] >> 4) << 8) | ((data[offset + 1] >> 4) << 4) | (data[offset + 2] >> 4);
    const current = buckets.get(key);
    if (current) current.count += 1;
    else buckets.set(key, { color: { r: data[offset], g: data[offset + 1], b: data[offset + 2] }, count: 1 });
  };

  for (let x = 0; x < width; x += 1) {
    visit(x, 0);
    if (height > 1) visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(0, y);
    if (width > 1) visit(width - 1, y);
  }

  let best: { color: RGB; count: number } | null = null;
  let border = 0;
  for (const bucket of buckets.values()) {
    border += bucket.count;
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (best && border > 0 && best.count / border > 0.55) return { mode: "color", color: best.color };
  return { mode: "none" };
}

function isInkPixel(data: Uint8ClampedArray, index: number, background: Background) {
  const offset = index * 4;
  const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
  if (background.mode === "alpha") return data[offset + 3] >= 16;
  if (background.mode === "color") return data[offset + 3] >= 16 && dist(pixel, background.color) > 30;
  return data[offset + 3] >= 16;
}

function clusterFree(data: Uint8ClampedArray, inkIndexes: number[]) {
  const buckets = new Map<number, Cluster>();
  for (const index of inkIndexes) {
    const offset = index * 4;
    const key = ((data[offset] >> 4) << 8) | ((data[offset + 1] >> 4) << 4) | (data[offset + 2] >> 4);
    addSample(buckets, key, data[offset], data[offset + 1], data[offset + 2]);
  }

  const populated = [...buckets.values()].filter((bucket) => bucket.count / inkIndexes.length >= 0.002);
  populated.sort((a, b) => b.count - a.count);
  const largest = populated[0] ? populated[0].count / inkIndexes.length : 0;
  const top6 = populated.slice(0, 6).reduce((sum, bucket) => sum + bucket.count, 0) / inkIndexes.length;
  const longRamp = populated.length >= 14 && largest < 0.22 && top6 < 0.85;
  if (populated.length >= 45 || (populated.length >= 28 && top6 < 0.82) || longRamp) {
    return { photo: true as const, clusters: [], simplified: false };
  }

  const merged = mergeClusters([...buckets.values()].sort((a, b) => b.count - a.count), MERGE_DISTANCE);
  const large = merged.filter((cluster) => cluster.count / inkIndexes.length >= SMALL_SHARE);
  const seeds = large.length > 0 ? large : merged.slice(0, 1);
  let absorbed = 0;
  for (const cluster of merged) {
    if (seeds.includes(cluster)) continue;
    const host = nearest(seeds, cluster);
    if (!host || dist(host, cluster) > 90) {
      seeds.push(cluster);
      continue;
    }
    absorb(host, cluster);
    absorbed += cluster.count;
  }

  return { photo: false as const, clusters: seeds, simplified: absorbed / inkIndexes.length > 0.03 };
}

function clusterToPalette(data: Uint8ClampedArray, inkIndexes: number[], palette: RGB[]) {
  const clusters: Cluster[] = palette.map((color) => ({ ...color, count: 0, sumR: 0, sumG: 0, sumB: 0 }));
  const extras: Cluster[] = [];

  for (const index of inkIndexes) {
    const offset = index * 4;
    const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    palette.forEach((color, colorIndex) => {
      const distance = dist(pixel, color);
      if (distance < bestDist) {
        bestDist = distance;
        best = colorIndex;
      }
    });
    if (bestDist <= PALETTE_SNAP) {
      const host = clusters[best];
      host.count += 1;
      host.sumR += pixel.r;
      host.sumG += pixel.g;
      host.sumB += pixel.b;
      continue;
    }
    const key = ((pixel.r >> 4) << 8) | ((pixel.g >> 4) << 4) | (pixel.b >> 4);
    let extra = extras.find((item) => item.r === key);
    if (!extra) {
      extra = { r: key, g: 0, b: 0, count: 0, sumR: 0, sumG: 0, sumB: 0 };
      extras.push(extra);
    }
    extra.count += 1;
    extra.sumR += pixel.r;
    extra.sumG += pixel.g;
    extra.sumB += pixel.b;
  }

  const kept = clusters.filter((cluster) => cluster.count > 0);
  let simplified = false;
  for (const extra of extras) {
    const mean = { r: extra.sumR / extra.count, g: extra.sumG / extra.count, b: extra.sumB / extra.count };
    const share = extra.count / inkIndexes.length;
    const host = nearest(kept, mean);
    if (share < 0.02 && host) {
      absorb(host, { ...extra, ...mean });
      simplified = true;
      continue;
    }
    kept.push({ ...mean, count: extra.count, sumR: extra.sumR, sumG: extra.sumG, sumB: extra.sumB });
    simplified = true;
  }

  return { photo: false as const, clusters: kept, simplified };
}

function addSample(buckets: Map<number, Cluster>, key: number, r: number, g: number, b: number) {
  const current = buckets.get(key);
  if (current) {
    current.count += 1;
    current.sumR += r;
    current.sumG += g;
    current.sumB += b;
    return;
  }
  buckets.set(key, { r, g, b, count: 1, sumR: r, sumG: g, sumB: b });
}

function mergeClusters(clusters: Cluster[], maxDistance: number) {
  const merged: Cluster[] = [];
  for (const cluster of clusters) {
    const mean = { r: cluster.sumR / cluster.count, g: cluster.sumG / cluster.count, b: cluster.sumB / cluster.count };
    const host = merged.find((item) => dist(item, mean) < maxDistance);
    if (!host) {
      merged.push({ ...mean, count: cluster.count, sumR: cluster.sumR, sumG: cluster.sumG, sumB: cluster.sumB });
      continue;
    }
    absorb(host, { ...cluster, ...mean });
  }
  return merged;
}

function absorb(host: Cluster, cluster: Cluster) {
  host.sumR += cluster.sumR;
  host.sumG += cluster.sumG;
  host.sumB += cluster.sumB;
  host.count += cluster.count;
  host.r = host.sumR / host.count;
  host.g = host.sumG / host.count;
  host.b = host.sumB / host.count;
}

function nearest(clusters: Cluster[], color: RGB) {
  let host: Cluster | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const cluster of clusters) {
    const distance = dist(cluster, color);
    if (distance < best) {
      best = distance;
      host = cluster;
    }
  }
  return host;
}

function isFine(assignment: Uint16Array, width: number, height: number, ink: number, finePx: number) {
  let thin = 0;
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      const start = x;
      const row = y * width;
      while (x < width && assignment[row + x] === ink) x += 1;
      const run = x - start;
      if (run > 0) {
        total += run;
        if (run <= finePx) thin += run;
      }
      while (x < width && assignment[row + x] !== ink) x += 1;
    }
  }
  return total > 0 && thin / total > 0.12;
}

function hexKey(color: RGB) {
  return `${color.r},${color.g},${color.b}`;
}

function parseStored(hex: string): RGB {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

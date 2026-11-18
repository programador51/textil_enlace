"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { designLabel, fabricLabel } from "@/lib/labels";
import { buildRequestMessage } from "@/lib/message";
import { matchOrientation, sortForRequest, suggestedProcessSlugs } from "@/lib/orientation";
import { artMessageLine, artOrientationCopy, artProcessSlugs } from "@/lib/separator/orient";
import type { ArtHint, ArtPayload } from "@/lib/separator/payload";
import { listPublicWorkshops, loadOrientationRules } from "@/lib/queries";
import type { OrientationView, PublicWorkshop, Receipt } from "@/lib/types";
import { firstIssue, previewSchema, requestSchema } from "@/lib/validators";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type ActionOk<T> = { ok: true; data: T };
export type ActionFail = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionFail;

export type PreviewData = {
  orientations: OrientationView[];
  suggested: PublicWorkshop[];
  others: PublicWorkshop[];
};

function makeFolio() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "TE-";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

function isUniqueFolioError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function previewRequest(input: unknown): Promise<ActionResult<PreviewData>> {
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const garment = await prisma.garment.findUnique({ where: { slug: parsed.data.garmentSlug } });
  if (!garment) return { ok: false, error: "Esa prenda no está en la lista." };

  const resolved = await resolveOrientation(
    {
      quantity: parsed.data.quantity,
      designClass: parsed.data.designClass,
      fabric: parsed.data.fabric,
      garmentSlug: parsed.data.garmentSlug,
    },
    parsed.data.artHint,
  );
  const slugs = resolved.slugs;
  const workshops = sortForRequest(await listPublicWorkshops(), slugs);
  const suggested = workshops.filter((workshop) =>
    workshop.processes.some((process) => slugs.includes(process.slug)),
  );
  const suggestedIds = new Set(suggested.map((workshop) => workshop.id));

  return {
    ok: true,
    data: {
      orientations: resolved.views,
      suggested,
      others: workshops.filter((workshop) => !suggestedIds.has(workshop.id)),
    },
  };
}

export async function sendRequest(input: unknown): Promise<ActionResult<Receipt>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const data = parsed.data;
  const garment = await prisma.garment.findUnique({ where: { slug: data.garmentSlug } });
  if (!garment) return { ok: false, error: "Esa prenda no está en la lista." };

  const uniqueIds = [...new Set(data.workshopIds)];
  const workshops = await prisma.workshop.findMany({
    where: { id: { in: uniqueIds }, published: true },
  });
  if (workshops.length !== uniqueIds.length) {
    return { ok: false, error: "Alguno de los talleres ya no está disponible. Vuelve a elegir." };
  }

  const resolved = await resolveOrientation(
    {
      quantity: data.quantity,
      designClass: data.designClass,
      fabric: data.fabric,
      garmentSlug: data.garmentSlug,
    },
    data.art,
  );
  const preparedArt = prepareArt(data.art);
  if (preparedArt && !preparedArt.ok) return preparedArt;
  const garmentLabel = garment.slug === "otra" ? data.garmentCustom.trim() : garment.name;
  const messageInput = {
    customerName: data.customerName,
    garmentLabel,
    quantity: data.quantity,
    designLabel: designLabel(data.designClass),
    fabricLabel: fabricLabel(data.fabric),
    neededBy: data.neededBy,
    zone: data.zone,
    note: data.note,
    customerContact: data.customerContact,
    artLine: data.art ? artMessageLine(data.art) : undefined,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const folio = makeFolio();
    try {
      await prisma.request.create({
        data: {
          folio,
          garmentSlug: garment.slug,
          garmentLabel,
          quantity: data.quantity,
          designClass: data.designClass,
          fabric: data.fabric,
          neededBy: new Date(`${data.neededBy}T00:00:00.000Z`),
          zone: data.zone,
          note: data.note || null,
          customerName: data.customerName,
          customerContact: data.customerContact,
          orientations: {
            create: resolved.views.map((view, index) => ({
              title: view.title,
              explanation: view.explanation,
              sortOrder: index,
            })),
          },
          deliveries: {
            create: uniqueIds.map((workshopId) => ({ workshopId })),
          },
          art: preparedArt?.ok ? { create: preparedArt.data } : undefined,
        },
      });

      const byId = new Map(workshops.map((workshop) => [workshop.id, workshop]));
      return {
        ok: true,
        data: {
          folio,
          message: buildRequestMessage({ ...messageInput, folio }),
          workshops: uniqueIds.map((id) => {
            const workshop = byId.get(id)!;
            return {
              id: workshop.id,
              name: workshop.name,
              phone: workshop.phone,
              zone: workshop.zone,
            };
          }),
        },
      };
    } catch (error) {
      if (isUniqueFolioError(error) && attempt < 4) continue;
      throw error;
    }
  }

  return { ok: false, error: "No se pudo guardar la solicitud. Inténtalo de nuevo." };
}

async function resolveOrientation(
  input: { quantity: number; designClass: string; fabric: string; garmentSlug: string },
  art: ArtHint | ArtPayload | null | undefined,
) {
  const rules = matchOrientation(await loadOrientationRules(), input);
  if (!art) {
    return {
      slugs: suggestedProcessSlugs(rules),
      views: rules.map((rule) => ({
        title: rule.title,
        explanation: rule.explanation,
        processes: rule.processes.map((process) => process.name),
      })),
    };
  }

  const chosen = artProcessSlugs(art.kind);
  if (!chosen) {
    return {
      slugs: suggestedProcessSlugs(rules),
      views: rules.map((rule) => ({
        title: rule.title,
        explanation: rule.explanation,
        processes: rule.processes.map((process) => process.name),
      })),
    };
  }
  const slugs = [...chosen];
  const processes = await prisma.process.findMany({
    where: { slug: { in: slugs } },
    orderBy: { sortOrder: "asc" },
  });
  const copy = artOrientationCopy(art);
  return {
    slugs,
    views: [
      {
        title: copy.title,
        explanation: copy.explanation,
        processes: processes.map((process) => process.name),
      },
    ],
  };
}

function prepareArt(art: ArtPayload | null | undefined) {
  if (!art) return null;
  const allowed = ["image/png", "image/jpeg", "image/svg+xml", "application/pdf", "application/octet-stream"];
  if (!allowed.includes(art.mimeType)) return { ok: false as const, error: "Ese tipo de archivo no se puede adjuntar." };
  const source = Buffer.from(art.sourceBase64, "base64");
  const preview = Buffer.from(art.previewBase64, "base64");
  if (source.length === 0 || source.length > 1_500_000) {
    return { ok: false as const, error: "El logo pesa demasiado para guardarlo con la solicitud." };
  }
  if (preview.length === 0 || preview.length > 600_000) return { ok: false as const, error: "La vista del logo pesa demasiado." };
  return {
    ok: true as const,
    data: {
    fileName: art.fileName,
    mimeType: art.mimeType,
    source,
    preview,
    kind: art.kind,
    reason: art.reason,
    fabric: art.fabric,
    inkCount: art.inkCount,
    widthCm: art.widthCm,
    heightCm: art.heightCm,
    dpi: art.dpi,
    chokeMm: art.chokeMm,
    colors: art.colors,
    recipe: art.recipe,
    },
  };
}

"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { designLabel, fabricLabel } from "@/lib/labels";
import { buildRequestMessage } from "@/lib/message";
import { matchOrientation, sortForRequest, suggestedProcessSlugs } from "@/lib/orientation";
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

  const rules = matchOrientation(await loadOrientationRules(), {
    quantity: parsed.data.quantity,
    designClass: parsed.data.designClass,
    fabric: parsed.data.fabric,
    garmentSlug: parsed.data.garmentSlug,
  });
  const slugs = suggestedProcessSlugs(rules);
  const workshops = sortForRequest(await listPublicWorkshops(), slugs);
  const suggested = workshops.filter((workshop) =>
    workshop.processes.some((process) => slugs.includes(process.slug)),
  );
  const suggestedIds = new Set(suggested.map((workshop) => workshop.id));

  return {
    ok: true,
    data: {
      orientations: rules.map((rule) => ({
        title: rule.title,
        explanation: rule.explanation,
        processes: rule.processes.map((process) => process.name),
      })),
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

  const rules = matchOrientation(await loadOrientationRules(), {
    quantity: data.quantity,
    designClass: data.designClass,
    fabric: data.fabric,
    garmentSlug: data.garmentSlug,
  });
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
            create: rules.map((rule, index) => ({
              title: rule.title,
              explanation: rule.explanation,
              sortOrder: index,
            })),
          },
          deliveries: {
            create: uniqueIds.map((workshopId) => ({ workshopId })),
          },
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

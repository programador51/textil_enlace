import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { DesignClass, FabricTone, WorkshopSize } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { asConditions } from "@/lib/orientation";
import type { OrientationRuleLike } from "@/lib/orientation";
import type { ProcessOption, PublicWorkshop } from "@/lib/types";

const workshopInclude = {
  processes: { include: { process: true } },
  garments: { include: { garment: true } },
} as const;

type WorkshopRecord = {
  id: string;
  name: string;
  size: WorkshopSize;
  zone: string;
  contactName: string;
  phone: string;
  phrase: string;
  processes: { process: { slug: string; name: string; sortOrder: number } }[];
  garments: { garment: { slug: string; name: string; sortOrder: number } }[];
};

export function toPublicWorkshop(workshop: WorkshopRecord): PublicWorkshop {
  return {
    id: workshop.id,
    name: workshop.name,
    size: workshop.size,
    zone: workshop.zone,
    contactName: workshop.contactName,
    phone: workshop.phone,
    phrase: workshop.phrase,
    processes: [...workshop.processes]
      .sort((a, b) => a.process.sortOrder - b.process.sortOrder || a.process.name.localeCompare(b.process.name, "es"))
      .map((item) => ({ slug: item.process.slug, name: item.process.name })),
    garments: [...workshop.garments]
      .sort((a, b) => a.garment.sortOrder - b.garment.sortOrder)
      .map((item) => ({ slug: item.garment.slug, name: item.garment.name })),
  };
}

export async function listGarments() {
  const garments = await prisma.garment.findMany({ orderBy: { sortOrder: "asc" } });
  return garments.map((garment) => ({ slug: garment.slug, name: garment.name }));
}

export async function listSelectableProcesses(workshopId?: string): Promise<ProcessOption[]> {
  const processes = await prisma.process.findMany({
    where: workshopId
      ? { OR: [{ custom: false }, { workshops: { some: { workshopId } } }] }
      : { custom: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return processes.map((process) => ({
    slug: process.slug,
    name: process.name,
    custom: process.custom,
  }));
}

export async function listPublicWorkshops() {
  const workshops = await prisma.workshop.findMany({
    where: { published: true },
    include: workshopInclude,
    orderBy: { name: "asc" },
  });
  return workshops.map(toPublicWorkshop);
}

export async function getPublicWorkshop(id: string) {
  const workshop = await prisma.workshop.findFirst({
    where: { id, published: true },
    include: workshopInclude,
  });
  return workshop ? toPublicWorkshop(workshop) : null;
}

export async function loadOrientationRules(): Promise<OrientationRuleLike[]> {
  const rules = await prisma.orientationRule.findMany({
    orderBy: { sortOrder: "asc" },
    include: { processes: { include: { process: true } } },
  });

  return rules.map((rule) => ({
    slug: rule.slug,
    title: rule.title,
    explanation: rule.explanation,
    sortOrder: rule.sortOrder,
    conditions: asConditions(rule.conditions),
    processes: [...rule.processes]
      .sort((a, b) => a.process.sortOrder - b.process.sortOrder)
      .map((item) => ({ slug: item.process.slug, name: item.process.name })),
  }));
}

export const requireWorkshop = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/taller/entrar");

  const workshop = await prisma.workshop.findUnique({
    where: { id: session.id },
    include: workshopInclude,
  });
  if (!workshop) redirect("/taller/entrar");
  return workshop;
});

export async function listWorkshopRequests(workshopId: string) {
  return prisma.delivery.findMany({
    where: { workshopId },
    orderBy: { sentAt: "desc" },
    include: {
      request: {
        include: {
          orientations: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export function dateToIso(value: Date) {
  return value.toISOString().slice(0, 10);
}

export type StoredRequest = {
  folio: string;
  garmentLabel: string;
  quantity: number;
  designClass: DesignClass;
  fabric: FabricTone;
  neededBy: Date;
  zone: string;
  note: string | null;
  customerName: string;
  customerContact: string;
  createdAt: Date;
};

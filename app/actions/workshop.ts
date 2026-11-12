"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, clearSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireWorkshop } from "@/lib/queries";
import { fichaSchema, firstIssue, loginSchema, slugify, workshopSchema } from "@/lib/validators";

export type FormState = { error: string } | null;

function checked(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

type IdsResult = { ok: true; ids: string[] } | { ok: false; error: string };

async function resolveProcesses(slugs: string[], customName: string): Promise<IdsResult> {
  const selected = await prisma.process.findMany({ where: { slug: { in: slugs } } });
  if (selected.length !== new Set(slugs).size) {
    return { ok: false, error: "Hay un proceso que ya no existe. Recarga la página." };
  }

  const ids = selected.map((process) => process.id);
  const custom = customName.trim();
  if (!custom) return { ok: true, ids };

  const slug = slugify(custom);
  if (!slug) return { ok: false, error: "Escribe el nombre del otro proceso con letras o números." };

  const existing = await prisma.process.findUnique({ where: { slug } });
  if (existing) {
    if (!ids.includes(existing.id)) ids.push(existing.id);
    return { ok: true, ids };
  }

  const created = await prisma.process.create({
    data: { slug, name: custom, custom: true, sortOrder: 100 },
  });
  ids.push(created.id);
  return { ok: true, ids };
}

async function resolveGarments(slugs: string[]): Promise<IdsResult> {
  const garments = await prisma.garment.findMany({ where: { slug: { in: slugs } } });
  if (garments.length !== new Set(slugs).size) {
    return { ok: false, error: "Hay una prenda que ya no existe. Recarga la página." };
  }
  return { ok: true, ids: garments.map((garment) => garment.id) };
}

function refreshWorkshopPaths(id?: string) {
  revalidatePath("/");
  revalidatePath("/talleres");
  revalidatePath("/solicitar");
  revalidatePath("/taller");
  revalidatePath("/taller/ficha");
  if (id) revalidatePath(`/talleres/${id}`);
}

export async function registerWorkshop(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = workshopSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
    name: text(formData, "name"),
    size: text(formData, "size"),
    zone: text(formData, "zone"),
    contactName: text(formData, "contactName"),
    phone: text(formData, "phone"),
    phrase: text(formData, "phrase"),
    processSlugs: checked(formData, "processSlug"),
    customProcess: text(formData, "customProcess"),
    garmentSlugs: checked(formData, "garmentSlug"),
    published: formData.get("published") === "si",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const processes = await resolveProcesses(parsed.data.processSlugs, parsed.data.customProcess ?? "");
  if (!processes.ok) return { error: processes.error };
  const garments = await resolveGarments(parsed.data.garmentSlugs);
  if (!garments.ok) return { error: garments.error };

  try {
    const workshop = await prisma.workshop.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        name: parsed.data.name,
        size: parsed.data.size,
        zone: parsed.data.zone,
        contactName: parsed.data.contactName,
        phone: parsed.data.phone,
        phrase: parsed.data.phrase,
        published: parsed.data.published,
        processes: { create: processes.ids.map((processId) => ({ processId })) },
        garments: { create: garments.ids.map((garmentId) => ({ garmentId })) },
      },
    });
    await createSession({ id: workshop.id, name: workshop.name });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya hay un taller registrado con ese correo." };
    }
    throw error;
  }

  refreshWorkshopPaths();
  redirect("/taller");
}

export async function loginWorkshop(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const workshop = await prisma.workshop.findUnique({ where: { email: parsed.data.email } });
  const matches = workshop
    ? await verifyPassword(parsed.data.password, workshop.passwordHash)
    : false;
  if (!workshop || !matches) return { error: "Correo o contraseña no coinciden." };

  await createSession({ id: workshop.id, name: workshop.name });
  redirect("/taller");
}

export async function logoutWorkshop() {
  await clearSession();
  redirect("/");
}

export async function updateFicha(_state: FormState, formData: FormData): Promise<FormState> {
  const current = await requireWorkshop();
  const parsed = fichaSchema.safeParse({
    name: text(formData, "name"),
    size: text(formData, "size"),
    zone: text(formData, "zone"),
    contactName: text(formData, "contactName"),
    phone: text(formData, "phone"),
    phrase: text(formData, "phrase"),
    processSlugs: checked(formData, "processSlug"),
    customProcess: text(formData, "customProcess"),
    garmentSlugs: checked(formData, "garmentSlug"),
    published: formData.get("published") === "si",
    password: text(formData, "password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (parsed.data.password && parsed.data.password.length < 8) {
    return { error: "La contraseña nueva necesita al menos 8 caracteres." };
  }

  const processes = await resolveProcesses(parsed.data.processSlugs, parsed.data.customProcess ?? "");
  if (!processes.ok) return { error: processes.error };
  const garments = await resolveGarments(parsed.data.garmentSlugs);
  if (!garments.ok) return { error: garments.error };

  await prisma.$transaction(async (tx) => {
    await tx.workshop.update({
      where: { id: current.id },
      data: {
        name: parsed.data.name,
        size: parsed.data.size,
        zone: parsed.data.zone,
        contactName: parsed.data.contactName,
        phone: parsed.data.phone,
        phrase: parsed.data.phrase,
        published: parsed.data.published,
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
      },
    });
    await tx.workshopProcess.deleteMany({ where: { workshopId: current.id } });
    await tx.workshopGarment.deleteMany({ where: { workshopId: current.id } });
    await tx.workshopProcess.createMany({
      data: processes.ids.map((processId) => ({ workshopId: current.id, processId })),
    });
    await tx.workshopGarment.createMany({
      data: garments.ids.map((garmentId) => ({ workshopId: current.id, garmentId })),
    });
  });

  await createSession({ id: current.id, name: parsed.data.name });
  refreshWorkshopPaths(current.id);
  redirect("/taller?guardada=1");
}

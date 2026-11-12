import { z } from "zod";
import { ZONES } from "@/lib/labels";

const designClass = z.enum(
  ["POCOS_COLORES", "FOTO", "NOMBRE_NUMERO", "SIN_ARCHIVO"],
  "Elige cómo es el diseño.",
);

const fabric = z.enum(["CLARA", "OSCURA", "SIN_DATO"], "Indica si la tela es clara, oscura o si no lo sabes.");

const requestFields = {
  garmentSlug: z.string().min(1, "Elige la prenda."),
  garmentCustom: z.string().trim().max(80, "El nombre de la prenda es demasiado largo.").default(""),
  quantity: z
    .number("Escribe cuántas piezas necesitas.")
    .int("La cantidad tiene que ser un número entero.")
    .min(1, "La cantidad mínima es una pieza.")
    .max(100000, "Esa cantidad es demasiado alta para esta versión."),
  designClass,
  fabric,
  neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha en que lo necesitas."),
  zone: z.string().min(1, "Elige la zona."),
  note: z.string().trim().max(500, "La nota puede tener hasta 500 caracteres.").default(""),
  customerName: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es demasiado largo."),
  customerContact: z
    .string()
    .trim()
    .min(8, "Escribe un teléfono o un correo para que el taller pueda responderte.")
    .max(80, "El contacto es demasiado largo."),
};

function refineRequest(
  value: { zone: string; garmentSlug: string; garmentCustom: string; neededBy: string },
  ctx: z.core.$ZodRawIssue | z.RefinementCtx,
) {
  const issue = ctx as { addIssue: (issue: { code: "custom"; message: string; path: string[] }) => void };
  if (!(ZONES as readonly string[]).includes(value.zone)) {
    issue.addIssue({ code: "custom", message: "Elige una zona de Monterrey o su área.", path: ["zone"] });
  }
  if (value.garmentSlug === "otra" && value.garmentCustom.trim().length < 2) {
    issue.addIssue({ code: "custom", message: "Escribe qué prenda es.", path: ["garmentCustom"] });
  }
  if (Number.isNaN(Date.parse(`${value.neededBy}T00:00:00.000Z`))) {
    issue.addIssue({ code: "custom", message: "La fecha no es válida.", path: ["neededBy"] });
  }
}

export const previewSchema = z.object(requestFields).superRefine(refineRequest);

export const requestSchema = z
  .object({
    ...requestFields,
    workshopIds: z.array(z.string().min(1)).min(1, "Elige al menos un taller.").max(12),
  })
  .superRefine(refineRequest);

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 10, "Escribe un teléfono de 10 dígitos.");

export const workshopSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido.")),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres.").max(80),
  name: z.string().trim().min(2, "Escribe el nombre del taller.").max(80),
  size: z.enum(["CHICO", "MEDIANO"], "Elige si el taller es chico o mediano."),
  zone: z
    .string()
    .refine(
      (value) => (ZONES as readonly string[]).includes(value),
      "Elige una zona de Monterrey o su área.",
    ),
  contactName: z.string().trim().min(2, "Escribe quién recibe las solicitudes.").max(80),
  phone,
  phrase: z
    .string()
    .trim()
    .min(10, "Escribe una frase sobre los encargos que toman.")
    .max(180, "La frase puede tener hasta 180 caracteres."),
  processSlugs: z.array(z.string().min(1)).min(1, "Marca al menos un proceso."),
  customProcess: z.string().trim().max(40, "El nombre del proceso es demasiado largo.").default(""),
  garmentSlugs: z.array(z.string().min(1)).min(1, "Marca al menos una prenda."),
  published: z.boolean(),
});

export const fichaSchema = workshopSchema.omit({ email: true, password: true }).extend({
  password: z.string().max(80).default(""),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Escribe el correo del taller.")),
  password: z.string().min(1, "Escribe la contraseña."),
});

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revisa los datos.";
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

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

const artColorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  slug: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fine: z.boolean(),
});

const recipeStepSchema = z.object({
  order: z.number().int().min(1).max(20),
  name: z.string().trim().min(1).max(60),
  mesh: z.string().trim().max(40),
  passes: z.number().int().min(1).max(8).nullable(),
  kind: z.enum(["base", "flash", "ink"]),
});

export const artHintSchema = z
  .object({
    kind: z.enum(["PLANAS", "SIMPLIFICA", "CMYK", "NO_ENTRA"]),
    inkCount: z.number().int().min(0).max(6),
    reason: z.string().trim().min(1).max(400),
    fabric: z.enum(["CLARA", "OSCURA"]),
  })
  .nullable();

export const artSchema = z
  .object({
    fileName: z.string().trim().min(1).max(120),
    mimeType: z.string().trim().min(1).max(80),
    sourceBase64: z.string().min(20).max(2_200_000),
    previewBase64: z.string().min(20).max(800_000),
    kind: z.enum(["PLANAS", "SIMPLIFICA", "CMYK", "NO_ENTRA"]),
    reason: z.string().trim().min(1).max(400),
    fabric: z.enum(["CLARA", "OSCURA"]),
    inkCount: z.number().int().min(0).max(6),
    widthCm: z.number().min(1).max(60),
    heightCm: z.number().min(1).max(60),
    dpi: z.number().int().min(72).max(300),
    chokeMm: z.number().min(0).max(5),
    colors: z.array(artColorSchema).max(6),
    recipe: z.array(recipeStepSchema).max(12),
  })
  .superRefine((value, ctx) => {
    const issue = ctx as { addIssue: (issue: { code: "custom"; message: string; path: string[] }) => void };
    if (value.kind === "NO_ENTRA") return;
    if (value.colors.length !== value.inkCount || value.inkCount < 1) {
      issue.addIssue({ code: "custom", message: "Las tintas del archivo no cierran.", path: ["colors"] });
    }
    if (value.recipe.length < 1) {
      issue.addIssue({ code: "custom", message: "Falta la receta de las capas.", path: ["recipe"] });
    }
  });

export const previewSchema = z
  .object({
    ...requestFields,
    artHint: artHintSchema.optional(),
  })
  .superRefine(refineRequest);

export const requestSchema = z
  .object({
    ...requestFields,
    workshopIds: z.array(z.string().min(1)).min(1, "Elige al menos un taller.").max(12),
    art: artSchema.nullable().optional(),
  })
  .superRefine(refineRequest);

export const printRuleSchema = z.object({
  baseMesh: z.string().trim().min(1, "Escribe los hilos de la base.").max(40),
  basePasses: z.number().int().min(1).max(8),
  colorMesh: z.string().trim().min(1, "Escribe los hilos de las tintas.").max(40),
  colorPasses: z.number().int().min(1).max(8),
  fineMesh: z.string().trim().min(1, "Escribe los hilos del detalle fino.").max(40),
  fineThresholdMm: z.number().min(0.1).max(3),
  inkNamesText: z.string().max(1000).default(""),
});

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

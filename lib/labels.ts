export const ZONES = [
  "Monterrey",
  "San Pedro Garza García",
  "San Nicolás de los Garza",
  "Guadalupe",
  "Apodaca",
  "Santa Catarina",
  "General Escobedo",
  "García",
  "Juárez",
  "Cadereyta Jiménez",
  "Santiago",
  "Otra zona del área metropolitana",
] as const;

export const DESIGN_OPTIONS = [
  {
    value: "POCOS_COLORES",
    label: "Pocos colores planos",
    hint: "Formas o letras de uno o pocos colores, sin degradado.",
  },
  {
    value: "FOTO",
    label: "Foto, degradado o muchos colores",
    hint: "Una imagen, un degradado o un diseño con muchos tonos.",
  },
  {
    value: "NOMBRE_NUMERO",
    label: "Nombre y número",
    hint: "Como en una playera de equipo o de generación.",
  },
  {
    value: "SIN_ARCHIVO",
    label: "Todavía no tengo el archivo",
    hint: "Puedes describir la idea en la nota.",
  },
] as const;

export const FABRIC_OPTIONS = [
  { value: "CLARA", label: "Tela clara" },
  { value: "OSCURA", label: "Tela oscura" },
  { value: "SIN_DATO", label: "No lo sé" },
] as const;

export const SIZE_OPTIONS = [
  { value: "CHICO", label: "Chico" },
  { value: "MEDIANO", label: "Mediano" },
] as const;

export type DesignClass = (typeof DESIGN_OPTIONS)[number]["value"];
export type FabricTone = (typeof FABRIC_OPTIONS)[number]["value"];
export type WorkshopSize = (typeof SIZE_OPTIONS)[number]["value"];

const DESIGN_LABELS = Object.fromEntries(
  DESIGN_OPTIONS.map((option) => [option.value, option.label]),
) as Record<DesignClass, string>;

const FABRIC_LABELS = Object.fromEntries(
  FABRIC_OPTIONS.map((option) => [option.value, option.label]),
) as Record<FabricTone, string>;

const SIZE_LABELS = Object.fromEntries(
  SIZE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<WorkshopSize, string>;

export function designLabel(value: string) {
  return DESIGN_LABELS[value as DesignClass] ?? value;
}

export function fabricLabel(value: string) {
  return FABRIC_LABELS[value as FabricTone] ?? value;
}

export function sizeLabel(value: string) {
  return SIZE_LABELS[value as WorkshopSize] ?? value;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function formatIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!year || !monthName || !day) return isoDate;
  return `${Number(day)} de ${monthName} de ${year}`;
}

export function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Monterrey",
  }).format(date);
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

export function pieceLabel(quantity: number) {
  return `${quantity} ${quantity === 1 ? "pieza" : "piezas"}`;
}

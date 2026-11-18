import { formatIsoDate, pieceLabel } from "@/lib/labels";

export type RequestMessageInput = {
  folio: string;
  customerName: string;
  garmentLabel: string;
  quantity: number;
  designLabel: string;
  fabricLabel: string;
  neededBy: string;
  zone: string;
  note: string;
  customerContact: string;
  artLine?: string;
};

export function buildRequestMessage(input: RequestMessageInput) {
  const lines = [
    `Hola, soy ${input.customerName}. Vi su taller en TextilEnlace y les mando el mismo encargo que a los talleres que elegí.`,
    "",
    `Folio: ${input.folio}`,
    `Prenda: ${input.garmentLabel}`,
    `Cantidad: ${pieceLabel(input.quantity)}`,
    `Diseño: ${input.designLabel}`,
    `Tela: ${input.fabricLabel}`,
    `Lo necesito: ${formatIsoDate(input.neededBy)}`,
    `Zona: ${input.zone}`,
  ];

  if (input.note.trim()) lines.push(`Nota: ${input.note.trim()}`);
  if (input.artLine) lines.push(input.artLine);

  lines.push(
    `Mi contacto: ${input.customerContact}`,
    "",
    "¿Me pueden cotizar este encargo? El precio y los tiempos los vemos directo con ustedes. TextilEnlace no calcula el precio.",
  );

  return lines.join("\n");
}

export function whatsappHref(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

import { Manual } from "@/components/manual";

export const metadata = {
  title: "Manual del taller",
};

const sections = [
  {
    heading: "Para quién es",
    paragraphs: [
      "Para un taller chico o mediano de Monterrey o su área que ya imprime y quiere recibir solicitudes. Un taller grande o una maquila industrial no entra en esta versión.",
      "Aparecer no tiene cuota mensual. Un pago no cambia el lugar en la lista.",
    ],
  },
  {
    heading: "Cómo publicar la ficha",
    paragraphs: [
      "Entra a Publicar mi ficha. Escribe el nombre del taller, si es chico o mediano, la zona, quién recibe las solicitudes y el teléfono. Marca los procesos que sí ofrecen y las prendas que sí imprimen.",
      "La frase es tuya. Por ejemplo: desde una pieza, o grupos y uniformes. No es una tarifa. Si tu proceso no está en la lista, escríbelo: aparece en tu ficha y en la lista completa.",
      "Puedes ocultar la ficha si todavía no quieres recibir solicitudes. Corregir el teléfono, los procesos o la frase lo haces tú, desde Mi ficha.",
    ],
  },
  {
    heading: "Cómo leer una solicitud",
    paragraphs: [
      "En Solicitudes ves los encargos en los que te eligieron. Cada uno trae prenda, cantidad, diseño, tela, fecha, zona, nota y el contacto de la persona.",
      "Desde ahí abres WhatsApp con el mismo texto, o lo copias. La cotización, el tiempo de producción y la forma de pago los acuerdas tú con la persona. Esos números no se capturan en el sitio.",
      "Si la solicitud trae un logo de tintas planas, también trae las capas y la receta. Tus hilos y los nombres de tus botes se guardan en Receta de impresión. Quien encargó sigue viendo la regla inicial.",
    ],
  },
  {
    heading: "Qué no hace el sitio",
    paragraphs: [
      "No calcula, compara ni guarda cotizaciones. No cobra, no factura y no produce la prenda. No pone reseñas ni lugares pagados. Enviar la solicitud no es un contrato ni una venta.",
    ],
  },
];

export default function ManualTallerPage() {
  return (
    <Manual
      title="Manual del taller"
      lede="Cómo publicar la ficha y responder una solicitud con tu propia cotización."
      sections={sections}
    />
  );
}

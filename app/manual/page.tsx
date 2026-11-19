import { Manual } from "@/components/manual";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Manual de quien encarga",
  description:
    "Guía paso a paso para describir un encargo textil, leer la orientación y enviar la misma solicitud a talleres de Monterrey.",
  path: "/manual",
});

const sections = [
  {
    heading: "Qué es este sitio",
    paragraphs: [
      "TextilEnlace conecta a quien necesita imprimir una prenda con talleres chicos y medianos de Monterrey y su área. No calcula el precio, no cobra y no produce la prenda.",
      "Tú describes el encargo. El sitio te dice, en una frase, qué tipo de impresión suele usarse. Luego eliges talleres y todos reciben el mismo texto.",
    ],
  },
  {
    heading: "Qué puedes tener a la mano",
    paragraphs: [
      "La prenda, aunque sea aproximada: playera, sudadera, gorra, uniforme, bolsa u otra. Cuántas piezas. Si la tela es clara, oscura o si no lo sabes. Cómo es el diseño, o si todavía no tienes el archivo. La fecha y la zona. Tu nombre y un teléfono o correo.",
    ],
  },
  {
    heading: "Cómo enviar la solicitud",
    paragraphs: [
      "Entra a Describir un encargo. No hace falta crear una cuenta. Avanza los pasos y, al final, marca uno o varios talleres. Puedes abrir también la lista completa y escribirle a un taller de otro proceso.",
      "Al enviar, cada taller recibe el mismo texto en su lista. Además puedes abrir WhatsApp con el mensaje ya escrito, o copiarlo si el enlace no abre.",
      "Si ya tienes el logo, adjúntalo en el paso del diseño o ábrelo en Separar tintas. Ahí puedes preparar serigrafía, vinil textil o sublimación. Al encargo solo se adjunta la serigrafía. Una foto no arma capas ni corte. El folio sigue sin un monto.",
    ],
  },
  {
    heading: "Cómo leer la orientación",
    paragraphs: [
      "La orientación informa. No te obliga a un proceso y no garantiza que el taller tome el trabajo. Si tu caso no encaja en uno solo, el sitio muestra los procesos cercanos y te deja ver a todos.",
      "En esa pantalla no aparece un precio ni un total. La comparación la haces tú, con las respuestas de los talleres.",
    ],
  },
  {
    heading: "El folio",
    paragraphs: [
      "Al enviar obtienes un folio, por ejemplo TE-K4M9QX. Puedes volver a abrirlo. Muestra qué pediste, qué orientación se mostró y a qué talleres se envió. No muestra un monto.",
      "Guarda ese enlace. Quien lo tenga puede ver el contacto que escribiste, porque es la copia de tu solicitud.",
    ],
  },
];

export default function ManualPage() {
  return <Manual title="Manual de quien encarga" lede="Cómo describir un encargo y mandar la misma solicitud a varios talleres." sections={sections} />;
}


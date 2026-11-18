import { Manual } from "@/components/manual";
import { buildPageMetadata, SEPARATOR_OG_IMAGE, SEPARATOR_TWITTER_IMAGE } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Manual de quien sube el logo",
  description:
    "Qué archivos acepta el separador de tintas, cómo leer las capas transparentes y cómo usar el PSD y la receta de impresión.",
  path: "/manual/separador",
  ogImage: SEPARATOR_OG_IMAGE,
  twitterImage: SEPARATOR_TWITTER_IMAGE,
});

const sections = [
  {
    heading: "Para qué sirve",
    paragraphs: [
      "El separador convierte un logo de colores sólidos en una capa por tinta, lista para revelar. Si la tela es oscura, agrega una base blanca encogida. Junto a las capas va la receta: malla, pasadas y orden.",
      "Se abre en el navegador, en Separar tintas. No se instala nada. También puedes adjuntar el logo al describir un encargo en TextilEnlace.",
    ],
  },
  {
    heading: "Qué archivos acepta",
    paragraphs: [
      "PNG, JPG, SVG o PDF. Si el PDF trae rellenos sólidos, cada relleno se toma como una tinta, para que un borde suavizado no invente colores de más.",
      "Logos, texto, números y escudos de uno a seis colores. Una sombra corta se reduce al color más cercano y conviene revisar el resultado.",
      "Si se ven más de seis tintas, el archivo se separa en cuatricromía: cian, magenta, amarillo y negro. Cada película lleva trama de semitonos, con un ángulo distinto por tinta.",
    ],
  },
  {
    heading: "Qué no separa",
    paragraphs: [
      "Una foto, un retrato, un degradado largo o una acuarela no producen capas. La pantalla lo dice antes de armar el ZIP.",
    ],
  },
  {
    heading: "Cómo leer el resultado",
    paragraphs: [
      "La vista sobre la tela sirve para reenviarla antes de revelar. El ZIP trae una capa transparente por color, con las mismas cruces de registro, un archivo de receta y capas.psd para ver en Photoshop todas las capas una sobre otra.",
      "En tela clara el orden va de la tinta más clara a la más oscura, y el negro queda al final. En tela oscura la base blanca va primero, luego un flash, y después las tintas. El ZIP no imprime la película: eso lo hace el equipo del taller.",
    ],
  },
  {
    heading: "Si el logo va con una solicitud",
    paragraphs: [
      "Al describir un encargo puedes adjuntar el archivo. Si son tintas planas, la orientación muestra serigrafía y el número de tintas. Si es una foto o un degradado, no se ofrecen esas capas y la orientación apunta a DTF o DTG.",
      "El folio guarda la imagen, las capas y la receta, y a qué talleres se envió. No guarda un monto. TextilEnlace no rechaza la solicitud por una regla de tinta.",
    ],
  },
];

export default function ManualSeparadorPage() {
  return (
    <Manual
      title="Manual de quien sube el logo"
      lede="Cómo separar un diseño de colores sólidos y, si quieres, mandarlo con la solicitud."
      sections={sections}
    />
  );
}

import { Manual } from "@/components/manual";
import { buildPageMetadata, SEPARATOR_OG_IMAGE, SEPARATOR_TWITTER_IMAGE } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Manual de quien sube el logo",
  description:
    "Cómo preparar un logo para serigrafía, vinil textil o sublimación, y cómo leer las capas, el DXF y el tiempo de plancha.",
  path: "/manual/separador",
  ogImage: SEPARATOR_OG_IMAGE,
  twitterImage: SEPARATOR_TWITTER_IMAGE,
});

const sections = [
  {
    heading: "Para qué sirve",
    paragraphs: [
      "El separador prepara un logo de tres maneras. Serigrafía: una capa por tinta, base blanca si la tela es oscura, y la receta de malla, pasadas y orden. Vinil textil: un DXF con una capa por color. Sublimación: la imagen en cuatricromía y en espejo.",
      "Se abre en el navegador, en Separar tintas. No se instala nada. La serigrafía también se puede adjuntar al describir un encargo. El vinil y la sublimación se descargan en esa pantalla.",
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
      "Una foto, un retrato, un degradado largo o una acuarela no producen capas de serigrafía ni corte de vinil. La pantalla dice por qué. Esa misma foto sí puede prepararse para sublimación.",
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
    heading: "Vinil textil",
    paragraphs: [
      "Elige Vinil textil antes de preparar el archivo. Solo entra un diseño de colores sólidos. Si es una foto, un degradado o una acuarela, no hay DXF: la pantalla explica que la navaja no tiene un borde limpio.",
      "El ZIP trae capas-vinil.dxf, en espejo, con una capa por color, y plancha-vinil.txt. El texto da el orden para planchar, la navaja, la velocidad, la máquina, el vinil y el tiempo. Es un punto de partida: si el rollo indica otro tiempo, manda el del rollo.",
    ],
  },
  {
    heading: "Sublimación",
    paragraphs: [
      "Elige Sublimación. La imagen sale adaptada a cian, magenta, amarillo y negro, y en espejo, lista para imprimirla en el papel.",
      "plancha-sublimacion.txt indica el tiempo en una playera de poliéster. El algodón no retiene la sublimación.",
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
      lede="Cómo preparar un diseño para serigrafía, vinil textil o sublimación."
      sections={sections}
    />
  );
}

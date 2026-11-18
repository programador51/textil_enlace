import { Manual } from "@/components/manual";

export const metadata = {
  title: "Manual del taller para la receta",
};

const sections = [
  {
    heading: "La regla inicial",
    paragraphs: [
      "Si nadie guardó una receta, la base blanca usa malla de 43 a 48 hilos por centímetro y dos pasadas. Las tintas del logo usan 62 a 77 y una pasada. Si hay texto o líneas muy delgadas, esa tinta sube a 90.",
      "Esa regla es una recomendación. El sistema no inventa la marca del bote ni el tiempo del horno.",
    ],
  },
  {
    heading: "Cómo guardar la tuya",
    paragraphs: [
      "Entra como taller y abre Receta de impresión. Ahí cambias los hilos, las pasadas y el grosor con el que una línea se considera delgada.",
      "Los nombres de bote se escriben uno por línea. Por ejemplo: rojo = rojo 186. La próxima solicitud con capas usa esos nombres cuando la abres tú.",
    ],
  },
  {
    heading: "Qué ve cada quien",
    paragraphs: [
      "Quien encargó el trabajo, y el folio, siguen con la regla inicial. Así todas las personas miran las mismas capas. Tu receta aparece en tu pantalla y en el ZIP que descargas desde la solicitud.",
      "Puedes subir o bajar una tinta en ese ZIP si en tu prensa el orden es otro. La base blanca, cuando la tela es oscura, se queda al principio.",
    ],
  },
  {
    heading: "Si el logo llegó por WhatsApp",
    paragraphs: [
      "Abre Separar tintas sin una solicitud. Descarga el ZIP y sigue el pedido como lo haces hoy. TextilEnlace no es requisito para separar, y el separador no es requisito para recibir una solicitud sin imagen.",
    ],
  },
];

export default function ManualRecetaPage() {
  return (
    <Manual
      title="Manual del taller para la receta"
      lede="Cómo guardar tus hilos, tus pasadas y los nombres de tus tintas."
      sections={sections}
    />
  );
}

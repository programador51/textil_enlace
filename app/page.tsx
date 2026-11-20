import { SeparatorStudio } from "@/components/separator-studio";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Separar tintas",
  absoluteTitle: "TextilEnlace · Separar tintas",
  description:
    "Prepara un logo para serigrafía, vinil textil, sublimación o bordado a máquina.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm font-bold tracking-wide text-gold uppercase">Separador de tintas planas</p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
        Sube el logo y elige serigrafía, vinil, sublimación o bordado.
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-ink-soft">
        En serigrafía, uno a seis colores sólidos salen en capas. Si hay más de seis, se separa en cuatricromía con trama de semitonos. El vinil entrega un DXF y el bordado un archivo DST; los dos solo aceptan colores sólidos. La sublimación entrega la imagen en cuatricromía y en espejo. Una foto no produce capas, corte ni puntadas. No calcula un precio.
      </p>
      <div className="mt-8">
        <SeparatorStudio mode="standalone" />
      </div>
    </main>
  );
}

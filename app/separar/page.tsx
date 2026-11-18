import { SeparatorStudio } from "@/components/separator-studio";

export const metadata = {
  title: "Separar tintas",
  description: "Separa un logo de colores sólidos en capas de serigrafía, con la malla, las pasadas y el orden.",
};

export default function SepararPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm font-bold tracking-wide text-gold uppercase">Separador de tintas planas</p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
        Sube el logo. Salen las capas, la base si la tela es oscura y la receta para imprimir.
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-ink-soft">
        Sirve para uno a seis colores sólidos. Si hay más de seis, se separa en cuatricromía con trama de semitonos. Una foto o un degradado largo no produce capas. Puedes usarlo solo, o adjuntar el logo al describir un encargo. No calcula un precio.
      </p>
      <div className="mt-8">
        <SeparatorStudio mode="standalone" />
      </div>
    </main>
  );
}

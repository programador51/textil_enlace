import Link from "next/link";

export const metadata = {
  title: { absolute: "TextilEnlace · Impresión textil en Monterrey" },
};

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:py-20">
        <div>
          <p className="text-sm font-bold tracking-wide text-gold uppercase">Monterrey y su área metropolitana</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Dile qué prenda necesitas. Te mostramos qué impresión suele usarse y qué talleres la hacen.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">
            La cotización la arma cada taller, con sus precios y sus tiempos. Este sitio no calcula un monto y no cobra la prenda.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="btn btn-primary" href="/solicitar">
              Describir mi encargo
            </Link>
            <Link className="btn btn-secondary" href="/talleres">
              Ver talleres
            </Link>
          </div>
        </div>
        <article className="panel rotate-0 p-6 sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-teal uppercase">Ejemplo, sin precio</p>
          <h2 className="mt-3 font-serif text-3xl">Playera · 24 piezas</h2>
          <p className="mt-2 text-ink-soft">Pocos colores planos · Tela oscura · Guadalupe</p>
          <div className="mt-6 border-t border-dashed border-line pt-5">
            <p className="text-sm font-bold text-gold">Orientación</p>
            <p className="mt-2 leading-7">
              Serigrafía. Con varias piezas y pocos colores, el preparado se reparte entre las piezas.
            </p>
          </div>
          <p className="mt-6 text-sm font-semibold">El taller responde con su propia cotización.</p>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <h2 className="font-serif text-3xl">Cómo se conectan las dos partes</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Describes el encargo", "Prenda, cantidad, diseño, tela, fecha, zona y un contacto. No necesitas cuenta."],
            ["2", "Ves la orientación", "Un texto dice qué procesos suelen usarse y por qué. No es una tarifa y no elimina talleres."],
            ["3", "Mandas la misma solicitud", "Eliges uno o varios talleres. Todos reciben el mismo texto y te cotizan por su medio."],
          ].map(([number, title, text]) => (
            <li key={number} className="panel">
              <span className="font-serif text-3xl text-dye">{number}</span>
              <h3 className="mt-3 font-serif text-2xl">{title}</h3>
              <p className="mt-2 leading-7 text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <article className="panel">
          <h2 className="font-serif text-3xl">Para quien encarga</h2>
          <p className="mt-3 leading-7 text-ink-soft">
            Si pides playeras, sudaderas, gorras, uniformes o bolsas y no sabes si te conviene serigrafía, DTF u otro proceso, empiezas aquí. Las cotizaciones que vuelvan hablan del mismo encargo.
          </p>
          <Link className="mt-5 inline-block font-semibold text-dye" href="/manual">
            Leer el manual
          </Link>
        </article>
        <article className="panel bg-teal text-white">
          <h2 className="font-serif text-3xl">Para el taller chico o mediano</h2>
          <p className="mt-3 leading-7 text-white/85">
            Publicas qué impresión textil haces, sin cargar una tarifa. Recibes solicitudes de personas que ya buscan ese servicio. El precio sigue siendo tuyo.
          </p>
          <Link className="btn btn-secondary mt-5" href="/taller/registro">
            Publicar mi ficha
          </Link>
        </article>
      </section>
    </main>
  );
}

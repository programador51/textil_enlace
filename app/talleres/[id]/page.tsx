import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WorkshopCard } from "@/components/workshop-card";
import { getPublicWorkshop } from "@/lib/queries";

export const metadata = {
  title: "Ficha del taller",
};

export default function TallerPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<p className="text-ink-soft">Cargando la ficha…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workshop = await getPublicWorkshop(id);
  if (!workshop) notFound();

  return (
    <div className="grid gap-6">
      <Link href="/talleres" className="text-sm font-semibold text-dye">
        Todos los talleres
      </Link>
      <WorkshopCard workshop={workshop} />
      <p className="notice">Esta ficha no tiene tarifa. El precio lo cotiza el taller cuando recibe tu solicitud.</p>
      <Link className="btn btn-primary justify-self-start" href={`/solicitar?taller=${workshop.id}`}>
        Incluir este taller en una solicitud
      </Link>
    </div>
  );
}

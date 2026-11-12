import Link from "next/link";
import { Suspense } from "react";
import { designLabel, formatIsoDate, pieceLabel, sizeLabel } from "@/lib/labels";
import { dateToIso, listWorkshopRequests, requireWorkshop } from "@/lib/queries";

export const metadata = {
  title: "Mi taller",
};

export default function TallerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ guardada?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Cargando el resumen…</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: Promise<{ guardada?: string }> }) {
  const [{ guardada }, workshop] = await Promise.all([searchParams, requireWorkshop()]);
  const deliveries = await listWorkshopRequests(workshop.id);

  return (
    <div className="grid gap-6">
      {guardada === "1" ? <p className="notice">La ficha quedó guardada.</p> : null}
      <div>
        <h1 className="font-serif text-4xl">{workshop.name}</h1>
        <p className="mt-2 text-ink-soft">
          {sizeLabel(workshop.size)} · {workshop.zone}
          {workshop.published ? "" : " · Ficha oculta"}
        </p>
        <p className="mt-4 leading-7">{workshop.phrase}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel">
          <h2 className="font-semibold">Procesos</h2>
          <p className="mt-2">{workshop.processes.map((item) => item.process.name).join(" · ") || "Sin procesos"}</p>
        </section>
        <section className="panel">
          <h2 className="font-semibold">Prendas</h2>
          <p className="mt-2">{workshop.garments.map((item) => item.garment.name).join(" · ") || "Sin prendas"}</p>
        </section>
      </div>
      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-serif text-3xl">Solicitudes</h2>
          <Link className="text-sm font-semibold text-dye" href="/taller/solicitudes">
            Ver todas
          </Link>
        </div>
        {deliveries.length === 0 ? (
          <p className="mt-3 text-ink-soft">Cuando alguien te elija, la solicitud aparece aquí. Esta lista no tiene precios.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {deliveries.slice(0, 5).map((delivery) => (
              <li key={delivery.id}>
                <Link className="panel block hover:border-teal" href={`/taller/solicitudes/${delivery.id}`}>
                  <span className="text-sm font-bold text-teal">{delivery.request.folio}</span>
                  <span className="mt-1 block font-serif text-2xl">
                    {delivery.request.garmentLabel} · {pieceLabel(delivery.request.quantity)}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {designLabel(delivery.request.designClass)} · {formatIsoDate(dateToIso(delivery.request.neededBy))} · {delivery.request.customerName}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

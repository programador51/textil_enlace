import Link from "next/link";
import { Suspense } from "react";
import { designLabel, formatIsoDate, pieceLabel } from "@/lib/labels";
import { dateToIso, listWorkshopRequests, requireWorkshop } from "@/lib/queries";

export const metadata = {
  title: "Solicitudes",
};

export default function SolicitudesPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Cargando solicitudes…</p>}>
      <List />
    </Suspense>
  );
}

async function List() {
  const workshop = await requireWorkshop();
  const deliveries = await listWorkshopRequests(workshop.id);

  return (
    <div>
      <h1 className="font-serif text-4xl">Solicitudes</h1>
      <p className="mt-3 text-ink-soft">Solo ves los encargos en los que te eligieron. El contacto es para cotizar esa solicitud.</p>
      {deliveries.length === 0 ? (
        <p className="mt-6">Todavía no hay solicitudes.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {deliveries.map((delivery) => (
            <li key={delivery.id}>
              <Link className="panel block hover:border-teal" href={`/taller/solicitudes/${delivery.id}`}>
                <span className="text-sm font-bold text-teal">{delivery.request.folio}</span>
                <span className="mt-1 block font-serif text-2xl">
                  {delivery.request.garmentLabel} · {pieceLabel(delivery.request.quantity)}
                </span>
                <span className="mt-1 block text-sm text-ink-soft">
                  {designLabel(delivery.request.designClass)} · lo necesita el {formatIsoDate(dateToIso(delivery.request.neededBy))} · {delivery.request.zone}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

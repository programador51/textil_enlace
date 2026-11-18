import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArtPanel } from "@/components/art-panel";
import { MessageActions } from "@/components/message-actions";
import { prisma } from "@/lib/db";
import { artMessageLine } from "@/lib/separator/orient";
import { asStoredArt } from "@/lib/separator/stored";
import { designLabel, fabricLabel, formatIsoDate, formatPhone, formatTimestamp, pieceLabel } from "@/lib/labels";
import { buildRequestMessage } from "@/lib/message";
import { dateToIso } from "@/lib/queries";

export const metadata = {
  title: "Folio",
  robots: { index: false, follow: false },
};

export default function FolioPage({ params }: { params: Promise<{ folio: string }> }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<p className="text-ink-soft">Abriendo el folio…</p>}>
        <Folio params={params} />
      </Suspense>
    </main>
  );
}

async function Folio({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params;
  const request = await prisma.request.findUnique({
    where: { folio: folio.toUpperCase() },
    include: {
      orientations: { orderBy: { sortOrder: "asc" } },
      deliveries: { include: { workshop: true }, orderBy: { sentAt: "asc" } },
      art: {
        select: {
          fileName: true,
          kind: true,
          reason: true,
          fabric: true,
          inkCount: true,
          widthCm: true,
          heightCm: true,
          dpi: true,
          chokeMm: true,
          colors: true,
          recipe: true,
        },
      },
    },
  });
  if (!request) notFound();

  const neededBy = dateToIso(request.neededBy);
  const storedArt = request.art ? asStoredArt(request.art) : null;
  const message = buildRequestMessage({
    folio: request.folio,
    customerName: request.customerName,
    garmentLabel: request.garmentLabel,
    quantity: request.quantity,
    designLabel: designLabel(request.designClass),
    fabricLabel: fabricLabel(request.fabric),
    neededBy,
    zone: request.zone,
    note: request.note ?? "",
    customerContact: request.customerContact,
    artLine: storedArt ? artMessageLine(storedArt) : undefined,
  });

  return (
    <article>
      <p className="text-xs font-bold tracking-[0.2em] text-teal uppercase">Folio de la conexión</p>
      <h1 className="mt-2 font-serif text-5xl">{request.folio}</h1>
      <p className="mt-2 text-sm text-ink-soft">{formatTimestamp(request.createdAt)}</p>
      <p className="notice mt-5">Este folio no tiene un monto. Guardó a quién se envió la solicitud y qué orientación se mostró.</p>

      <dl className="panel mt-6 grid gap-3 sm:grid-cols-2">
        <Item label="Prenda" value={request.garmentLabel} />
        <Item label="Cantidad" value={pieceLabel(request.quantity)} />
        <Item label="Diseño" value={designLabel(request.designClass)} />
        <Item label="Tela" value={fabricLabel(request.fabric)} />
        <Item label="Fecha" value={formatIsoDate(neededBy)} />
        <Item label="Zona" value={request.zone} />
        <Item label="Nombre" value={request.customerName} />
        <Item label="Contacto" value={request.customerContact} />
        {request.note ? <Item label="Nota" value={request.note} /> : null}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">
        El contacto se compartió solo con los talleres de esta lista, para cotizar esta solicitud. Quien tenga este enlace puede verlo.
      </p>

      <h2 className="mt-8 font-serif text-3xl">Orientación que se mostró</h2>
      <div className="mt-4 grid gap-3">
        {request.orientations.map((item) => (
          <section key={item.id} className="panel">
            <h3 className="font-serif text-2xl">{item.title}</h3>
            <p className="mt-2 leading-7">{item.explanation}</p>
          </section>
        ))}
      </div>

      {storedArt ? <ArtPanel folio={request.folio} art={storedArt} /> : null}

      <h2 className="mt-8 font-serif text-3xl">Talleres que recibieron la solicitud</h2>
      <ul className="mt-4 grid gap-4">
        {request.deliveries.map((delivery) => (
          <li key={delivery.id} className="panel">
            <h3 className="font-serif text-2xl">
              <Link href={`/talleres/${delivery.workshop.id}`}>{delivery.workshop.name}</Link>
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {delivery.workshop.zone} · {delivery.workshop.contactName} · {formatPhone(delivery.workshop.phone)}
            </p>
            <div className="mt-4">
              <MessageActions phone={delivery.workshop.phone} message={message} />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

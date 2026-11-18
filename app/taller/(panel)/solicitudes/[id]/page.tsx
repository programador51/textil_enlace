import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArtPanel } from "@/components/art-panel";
import { MessageActions } from "@/components/message-actions";
import { prisma } from "@/lib/db";
import { artMessageLine } from "@/lib/separator/orient";
import { asPrintRule, asStoredArt } from "@/lib/separator/stored";
import { designLabel, fabricLabel, formatIsoDate, formatTimestamp, pieceLabel } from "@/lib/labels";
import { buildRequestMessage } from "@/lib/message";
import { dateToIso, requireWorkshop } from "@/lib/queries";

export const metadata = {
  title: "Solicitud",
};

export default function SolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Cargando la solicitud…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, workshop] = await Promise.all([params, requireWorkshop()]);
  const [delivery, printRule] = await Promise.all([
    prisma.delivery.findFirst({
      where: { id, workshopId: workshop.id },
      include: {
        request: {
          include: {
            orientations: { orderBy: { sortOrder: "asc" } },
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
        },
      },
    }),
    prisma.workshopPrintRule.findUnique({ where: { workshopId: workshop.id } }),
  ]);
  if (!delivery) notFound();

  const request = delivery.request;
  const storedArt = request.art ? asStoredArt(request.art) : null;
  const neededBy = dateToIso(request.neededBy);
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
      <Link href="/taller/solicitudes" className="text-sm font-semibold text-dye">
        Todas las solicitudes
      </Link>
      <p className="mt-4 text-sm font-bold text-teal">{request.folio}</p>
      <h1 className="mt-1 font-serif text-4xl">
        {request.garmentLabel} · {pieceLabel(request.quantity)}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">Recibida el {formatTimestamp(delivery.sentAt)}</p>

      <dl className="panel mt-6 grid gap-3 sm:grid-cols-2">
        <Item label="Diseño" value={designLabel(request.designClass)} />
        <Item label="Tela" value={fabricLabel(request.fabric)} />
        <Item label="Fecha" value={formatIsoDate(neededBy)} />
        <Item label="Zona" value={request.zone} />
        <Item label="Nombre" value={request.customerName} />
        <Item label="Contacto" value={request.customerContact} />
        {request.note ? <Item label="Nota" value={request.note} /> : null}
      </dl>

      <div className="mt-4 grid gap-3">
        {request.orientations.map((item) => (
          <section key={item.id} className="notice">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1">{item.explanation}</p>
          </section>
        ))}
      </div>

      {storedArt ? <ArtPanel folio={request.folio} art={storedArt} rule={asPrintRule(printRule)} /> : null}

      <p className="mt-6 text-sm text-ink-soft">
        Cotiza con tus precios, tus mínimos y tus tiempos. Esos números no se guardan aquí.
      </p>
      <div className="mt-4">
        <MessageActions phone={request.customerContact} message={message} intent="responder" />
      </div>
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

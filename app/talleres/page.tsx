import { Suspense } from "react";
import { WorkshopDirectory } from "@/components/workshop-directory";
import { listPublicWorkshops } from "@/lib/queries";

export const metadata = {
  title: "Talleres",
};

export default function TalleresPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-4xl sm:text-5xl">Talleres participantes</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-soft">
        Son talleres chicos y medianos de Monterrey y su área. El orden sigue al proceso que ofrecen. Un pago no adelanta a nadie.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-soft">Cargando talleres…</p>}>
          <Directory />
        </Suspense>
      </div>
    </main>
  );
}

async function Directory() {
  const workshops = await listPublicWorkshops();
  if (workshops.length === 0) {
    return <p className="text-ink-soft">Todavía no hay fichas publicadas.</p>;
  }
  return <WorkshopDirectory workshops={workshops} />;
}

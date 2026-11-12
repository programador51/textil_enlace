import { Suspense } from "react";
import { RequestWizard } from "@/components/request-wizard";
import { listGarments } from "@/lib/queries";

export const metadata = {
  title: "Describir el encargo",
};

export default function SolicitarPage({
  searchParams,
}: {
  searchParams: Promise<{ taller?: string }>;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm font-bold tracking-wide text-gold uppercase">Sin cuenta</p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Describe el encargo con lo que sí sabes.</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-soft">
        No hace falta hablar como el taller. Al final eliges a quién escribirle y todos reciben el mismo texto.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-soft">Cargando el formulario…</p>}>
          <WizardLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function WizardLoader({ searchParams }: { searchParams: Promise<{ taller?: string }> }) {
  const [{ taller }, garments] = await Promise.all([searchParams, listGarments()]);
  return <RequestWizard garments={garments} initialWorkshopId={taller ?? ""} />;
}

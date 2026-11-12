import Link from "next/link";
import { Suspense } from "react";
import { WorkshopForm } from "@/components/workshop-form";
import { listGarments, listSelectableProcesses } from "@/lib/queries";

export const metadata = {
  title: "Publicar ficha",
  robots: { index: false, follow: false },
};

export default function RegistroPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl">Publicar la ficha del taller</h1>
      <p className="mt-3 leading-7 text-ink-soft">
        No subas una lista de precios. Marca qué impresión textil ofreces y cómo te escriben.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-soft">Cargando el formulario…</p>}>
          <Form />
        </Suspense>
      </div>
      <p className="mt-6 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link className="font-semibold text-dye" href="/taller/entrar">
          Entrar
        </Link>
      </p>
    </main>
  );
}

async function Form() {
  const [processes, garments] = await Promise.all([listSelectableProcesses(), listGarments()]);
  return <WorkshopForm mode="register" processes={processes} garments={garments} />;
}

import { Suspense } from "react";
import { WorkshopForm } from "@/components/workshop-form";
import { listGarments, listSelectableProcesses, requireWorkshop } from "@/lib/queries";

export const metadata = {
  title: "Mi ficha",
};

export default function FichaPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Cargando la ficha…</p>}>
      <Editor />
    </Suspense>
  );
}

async function Editor() {
  const workshop = await requireWorkshop();
  const [processes, garments] = await Promise.all([
    listSelectableProcesses(workshop.id),
    listGarments(),
  ]);

  return (
    <div>
      <h1 className="font-serif text-4xl">Mi ficha</h1>
      <p className="mt-3 max-w-xl leading-7 text-ink-soft">
        Corrige el teléfono, los procesos o la frase cuando quieras. No hay un campo de precio.
      </p>
      <div className="mt-8">
        <WorkshopForm
          mode="edit"
          processes={processes}
          garments={garments}
          defaults={{
            name: workshop.name,
            size: workshop.size,
            zone: workshop.zone,
            contactName: workshop.contactName,
            phone: workshop.phone,
            phrase: workshop.phrase,
            processSlugs: workshop.processes.map((item) => item.process.slug),
            garmentSlugs: workshop.garments.map((item) => item.garment.slug),
            published: workshop.published,
          }}
        />
      </div>
    </div>
  );
}

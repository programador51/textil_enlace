import { Suspense } from "react";
import { PrintRuleForm } from "@/components/print-rule-form";
import { prisma } from "@/lib/db";
import { asPrintRule } from "@/lib/separator/stored";
import { requireWorkshop } from "@/lib/queries";

export const metadata = {
  title: "Receta de impresión",
};

export default function RecetaPage({ searchParams }: { searchParams: Promise<{ guardada?: string }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Cargando la receta…</p>}>
      <Receta searchParams={searchParams} />
    </Suspense>
  );
}

async function Receta({ searchParams }: { searchParams: Promise<{ guardada?: string }> }) {
  const [{ guardada }, workshop] = await Promise.all([searchParams, requireWorkshop()]);
  const stored = await prisma.workshopPrintRule.findUnique({ where: { workshopId: workshop.id } });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-4xl">Receta de impresión</h1>
        <p className="mt-3 max-w-2xl leading-7 text-ink-soft">
          Estos hilos y estos nombres se usan cuando abres una solicitud con capas. Quien encargó el trabajo sigue viendo la regla inicial, para que todos miren las mismas capas. Aquí no hay un precio.
        </p>
      </div>
      <PrintRuleForm rule={asPrintRule(stored)} saved={guardada === "1"} />
    </div>
  );
}

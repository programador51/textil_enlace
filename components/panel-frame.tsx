import { requireWorkshop } from "@/lib/queries";
import { sizeLabel } from "@/lib/labels";
import { PanelNav } from "@/components/panel-nav";

export async function PanelFrame({ children }: { children: React.ReactNode }) {
  const workshop = await requireWorkshop();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <PanelNav name={workshop.name} detail={`${sizeLabel(workshop.size)} · ${workshop.zone}`} />
      <div>{children}</div>
    </div>
  );
}

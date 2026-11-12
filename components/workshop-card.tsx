import Link from "next/link";
import { formatPhone, sizeLabel } from "@/lib/labels";
import type { PublicWorkshop } from "@/lib/types";

export function ProcessChips({
  processes,
  highlight,
}: {
  processes: { slug: string; name: string }[];
  highlight?: string[];
}) {
  const marked = new Set(highlight ?? []);
  return (
    <ul className="flex flex-wrap gap-2">
      {processes.map((process) => {
        const active = marked.size === 0 || marked.has(process.slug) || marked.has(process.name);
        return (
          <li key={process.slug} className={active ? "chip" : "chip chip-muted"}>
            {process.name}
          </li>
        );
      })}
    </ul>
  );
}

export function WorkshopCard({
  workshop,
  href,
  highlight,
}: {
  workshop: PublicWorkshop;
  href?: string;
  highlight?: string[];
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl leading-tight">{workshop.name}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {sizeLabel(workshop.size)} · {workshop.zone}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6">{workshop.phrase}</p>
      <div className="mt-3">
        <ProcessChips processes={workshop.processes} highlight={highlight} />
      </div>
      <p className="mt-3 text-sm text-ink-soft">{workshop.garments.map((garment) => garment.name).join(" · ")}</p>
      <p className="mt-3 text-sm">
        Recibe solicitudes: {workshop.contactName}
        <span className="text-ink-soft"> · {formatPhone(workshop.phone)}</span>
      </p>
    </>
  );

  if (!href) return <article className="panel h-full">{body}</article>;

  return (
    <Link href={href} className="panel block h-full hover:border-teal">
      {body}
    </Link>
  );
}

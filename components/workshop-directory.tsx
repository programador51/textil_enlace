"use client";

import { useMemo, useState } from "react";
import { WorkshopCard } from "@/components/workshop-card";
import type { PublicWorkshop } from "@/lib/types";

export function WorkshopDirectory({ workshops }: { workshops: PublicWorkshop[] }) {
  const [process, setProcess] = useState("todos");
  const [zone, setZone] = useState("todas");

  const processes = useMemo(() => {
    const names = new Map<string, string>();
    for (const workshop of workshops) {
      for (const item of workshop.processes) names.set(item.slug, item.name);
    }
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [workshops]);

  const zones = useMemo(
    () => [...new Set(workshops.map((workshop) => workshop.zone))].sort((a, b) => a.localeCompare(b, "es")),
    [workshops],
  );

  const filtered = workshops.filter((workshop) => {
    const matchesProcess = process === "todos" || workshop.processes.some((item) => item.slug === process);
    const matchesZone = zone === "todas" || workshop.zone === zone;
    return matchesProcess && matchesZone;
  });

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label">
          Proceso
          <select className="field" value={process} onChange={(event) => setProcess(event.target.value)}>
            <option value="todos">Todos los procesos</option>
            {processes.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Zona
          <select className="field" value={zone} onChange={(event) => setZone(event.target.value)}>
            <option value="todas">Todas las zonas</option>
            {zones.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-6 text-ink-soft">Ningún taller publicado coincide con ese filtro.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} href={`/talleres/${workshop.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

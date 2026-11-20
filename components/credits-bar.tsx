"use client";

import { useEffect, useState } from "react";

const MEMBERS = [
  ["José Luis Pérez Olguín", "1731168"],
  ["Miguel Ángel Lazarin Cazares", "2078033"],
  ["Jose Luis Loera Galván", "2004653"],
  ["Liz Montserrat Garza Jiménez", "2022880"],
  ["Aurora Cardona Chávez", "2055392"],
] as const;

export function CreditsBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <section
        id="creditos-equipo"
        hidden={!open}
        className="max-h-[70vh] overflow-auto border-t border-line bg-card/95 px-4 py-4 shadow-[0_-8px_24px_rgba(28,25,21,0.08)] backdrop-blur-md sm:px-6"
      >
          <div className="mx-auto max-w-6xl text-sm leading-6">
            <p className="font-semibold">Universidad Autónoma de Nuevo León, Facultad de Ingeniería Mecánica y Eléctrica</p>
            <p className="mt-1 text-ink-soft">
              Administración de Sistemas de Información, Grupo 003 – Salón 4112 – N2 (L, M, V), PIA (Equipo 3)
            </p>
            <table className="mt-3 w-full max-w-xl border-collapse text-left">
              <thead>
                <tr className="text-ink-soft">
                  <th className="py-1 pr-4 font-semibold">Nombre</th>
                  <th className="py-1 font-semibold">Matrícula</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map(([name, id]) => (
                  <tr key={id} className="border-t border-line/80">
                    <td className="py-1 pr-4">{name}</td>
                    <td className="py-1 tabular-nums">{id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </section>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 border-t border-line bg-paper/90 px-4 py-1.5 text-xs font-semibold text-ink-soft backdrop-blur-md hover:text-ink"
        aria-expanded={open}
        aria-controls="creditos-equipo"
        onClick={() => setOpen((value) => !value)}
      >
        Equipo 3 · FIME
      </button>
    </div>
  );
}

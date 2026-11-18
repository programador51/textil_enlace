"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutWorkshop } from "@/app/actions/workshop";

const links = [
  { href: "/taller", label: "Resumen" },
  { href: "/taller/ficha", label: "Mi ficha" },
  { href: "/taller/receta", label: "Receta" },
  { href: "/taller/solicitudes", label: "Solicitudes" },
];

export function PanelNav({ name, detail }: { name: string; detail: string }) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24">
      <p className="font-serif text-2xl leading-tight">{name}</p>
      <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      <nav className="mt-4 flex gap-2 overflow-x-auto lg:flex-col" aria-label="Taller">
        {links.map((link) => {
          const current = link.href === "/taller" ? pathname === "/taller" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${current ? "bg-teal text-white" : "bg-card text-ink"}`}
            >
              {link.label}
            </Link>
          );
        })}
        <form action={logoutWorkshop}>
          <button className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft" type="submit">
            Salir
          </button>
        </form>
      </nav>
    </aside>
  );
}

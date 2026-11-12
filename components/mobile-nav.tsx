"use client";

import Link from "next/link";
import { useState } from "react";

type LinkItem = { href: string; label: string };

export function MobileNav({
  links,
  children,
}: {
  links: LinkItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn btn-secondary px-3"
        aria-expanded={open}
        aria-controls="menu-movil"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Cerrar" : "Menú"}
      </button>
      <nav
        id="menu-movil"
        aria-label="Móvil"
        className={`${open ? "grid" : "hidden"} absolute inset-x-0 top-16 gap-3 border-b border-line bg-paper px-4 py-4 shadow-sm`}
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="py-1 font-semibold" onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <div onClick={() => setOpen(false)}>{children}</div>
      </nav>
    </div>
  );
}

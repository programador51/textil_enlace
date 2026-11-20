import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { MobileNav } from "@/components/mobile-nav";

const links = [
  { href: "/solicitar", label: "Describir un encargo" },
  { href: "/", label: "Separar tintas" },
  { href: "/talleres", label: "Talleres" },
  { href: "/manual", label: "Manual" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tight">
          <span className="inline-block h-3 w-3 rounded-full bg-dye" aria-hidden />
          TextilEnlace
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex" aria-label="Principal">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-ink-soft hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <Suspense fallback={<Link className="btn btn-secondary" href="/taller/entrar">Soy taller</Link>}>
            <WorkshopEntry />
          </Suspense>
        </div>
        <MobileNav links={links}>
          <Suspense fallback={<Link href="/taller/entrar">Soy taller</Link>}>
            <WorkshopEntry className="font-semibold" />
          </Suspense>
        </MobileNav>
      </div>
    </header>
  );
}

async function WorkshopEntry({ className }: { className?: string }) {
  const session = await getSession();
  if (!session) {
    return (
      <Link href="/taller/entrar" className={className ?? "btn btn-secondary"}>
        Soy taller
      </Link>
    );
  }

  return (
    <Link href="/taller" className={className ?? "btn btn-secondary max-w-48 truncate"}>
      {session.name}
    </Link>
  );
}

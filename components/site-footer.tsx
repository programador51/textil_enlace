import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-soft sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>TextilEnlace · Monterrey y su área metropolitana. La cotización la hace cada taller.</p>
        <nav className="flex flex-wrap gap-4 font-semibold" aria-label="Pie">
          <Link href="/manual">Manual de quien encarga</Link>
          <Link href="/manual/taller">Manual del taller</Link>
          <Link href="/taller/entrar">Entrar como taller</Link>
        </nav>
      </div>
    </footer>
  );
}

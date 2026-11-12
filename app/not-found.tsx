import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-serif text-4xl">No encontramos esa página</h1>
      <p className="mt-3 text-ink-soft">El folio o la ficha no existen, o ya no están publicados.</p>
      <Link className="btn btn-primary mt-6" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}

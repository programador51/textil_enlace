"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-serif text-4xl">No se pudo cargar esta pantalla</h1>
      <p className="mt-3 text-ink-soft">Revisa la conexión con la base de datos e inténtalo de nuevo.</p>
      <button className="btn btn-primary mt-6" type="button" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}

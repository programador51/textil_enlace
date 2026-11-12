import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function EntrarPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl">Entrar como taller</h1>
      <p className="mt-3 leading-7 text-ink-soft">Aquí ves las solicitudes en las que te eligieron. Quien encarga no necesita cuenta.</p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-ink-soft">Cargando…</p>}>
          <Gate />
        </Suspense>
      </div>
      <p className="mt-6 text-sm">
        ¿Todavía no publicas tu ficha?{" "}
        <Link className="font-semibold text-dye" href="/taller/registro">
          Registrarme
        </Link>
      </p>
    </main>
  );
}

async function Gate() {
  const session = await getSession();
  if (session) redirect("/taller");
  return <LoginForm />;
}

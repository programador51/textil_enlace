"use client";

import { useActionState } from "react";
import { loginWorkshop } from "@/app/actions/workshop";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWorkshop, null);

  return (
    <form action={action} className="grid gap-4">
      {state?.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <label className="field-label">
        Correo
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field-label">
        Contraseña
        <input className="field" name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { registerWorkshop, updateFicha } from "@/app/actions/workshop";
import { SIZE_OPTIONS, ZONES } from "@/lib/labels";
import type { ProcessOption, PublicGarment } from "@/lib/types";

export type WorkshopDefaults = {
  name: string;
  size: string;
  zone: string;
  contactName: string;
  phone: string;
  phrase: string;
  processSlugs: string[];
  garmentSlugs: string[];
  published: boolean;
};

export function WorkshopForm({
  mode,
  processes,
  garments,
  defaults,
}: {
  mode: "register" | "edit";
  processes: ProcessOption[];
  garments: PublicGarment[];
  defaults?: WorkshopDefaults;
}) {
  const [state, action, pending] = useActionState(mode === "register" ? registerWorkshop : updateFicha, null);

  return (
    <form action={action} className="grid gap-8">
      {state?.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">El taller</h2>
        {mode === "register" ? (
          <>
            <label className="field-label">
              Correo para entrar
              <input className="field" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field-label">
              Contraseña
              <input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
          </>
        ) : null}
        <label className="field-label">
          Nombre del taller
          <input className="field" name="name" defaultValue={defaults?.name} required />
        </label>
        <fieldset className="grid gap-2">
          <legend className="font-semibold">Tamaño</legend>
          <p className="text-sm text-ink-soft">La primera versión es para talleres chicos y medianos.</p>
          {SIZE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3">
              <input type="radio" name="size" value={option.value} defaultChecked={defaults?.size === option.value || (!defaults && option.value === "CHICO")} required />
              {option.label}
            </label>
          ))}
        </fieldset>
        <label className="field-label">
          Zona
          <select className="field" name="zone" defaultValue={defaults?.zone ?? ""} required>
            <option value="" disabled>
              Elige una zona
            </option>
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl">Quién recibe las solicitudes</h2>
        <label className="field-label">
          Nombre
          <input className="field" name="contactName" defaultValue={defaults?.contactName} required />
        </label>
        <label className="field-label">
          Teléfono de WhatsApp
          <input className="field" name="phone" inputMode="tel" defaultValue={defaults?.phone} required />
        </label>
        <label className="field-label">
          Frase sobre los encargos que toman
          <textarea
            className="field min-h-24"
            name="phrase"
            maxLength={180}
            defaultValue={defaults?.phrase}
            placeholder="Por ejemplo: desde una pieza, o grupos y uniformes."
            required
          />
        </label>
      </section>

      <fieldset className="grid gap-2">
        <legend className="font-serif text-2xl">Procesos que sí ofrecen</legend>
        {processes.map((process) => (
          <label key={process.slug} className="flex items-center gap-3">
            <input type="checkbox" name="processSlug" value={process.slug} defaultChecked={defaults?.processSlugs.includes(process.slug)} />
            {process.name}
          </label>
        ))}
        <label className="field-label mt-2">
          Otro proceso de impresión textil
          <input className="field" name="customProcess" placeholder="Si el tuyo no está en la lista, escribe el nombre" />
        </label>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="font-serif text-2xl">Prendas que sí imprimen</legend>
        {garments
          .filter((garment) => garment.slug !== "otra")
          .map((garment) => (
            <label key={garment.slug} className="flex items-center gap-3">
              <input type="checkbox" name="garmentSlug" value={garment.slug} defaultChecked={defaults?.garmentSlugs.includes(garment.slug)} />
              {garment.name}
            </label>
          ))}
      </fieldset>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="published" value="si" defaultChecked={defaults?.published ?? true} />
        <span>
          <span className="block font-semibold">Mostrar la ficha en la lista</span>
          <span className="block text-sm text-ink-soft">Aparecer no tiene cuota y un pago no cambia el orden.</span>
        </span>
      </label>

      {mode === "edit" ? (
        <label className="field-label">
          Contraseña nueva
          <input className="field" name="password" type="password" autoComplete="new-password" placeholder="Déjala vacía si no quieres cambiarla" />
        </label>
      ) : null}

      <button className="btn btn-primary justify-self-start" type="submit" disabled={pending}>
        {pending ? "Guardando…" : mode === "register" ? "Publicar ficha" : "Guardar ficha"}
      </button>
    </form>
  );
}

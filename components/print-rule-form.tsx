"use client";

import { useActionState } from "react";
import { savePrintRule, type FormState } from "@/app/actions/workshop";
import type { PrintRule } from "@/lib/separator/types";

export function PrintRuleForm({ rule, saved }: { rule: PrintRule; saved: boolean }) {
  const [state, action, pending] = useActionState(savePrintRule, null as FormState);
  const inkNamesText = Object.entries(rule.inkNames)
    .map(([key, value]) => `${key} = ${value}`)
    .join("\n");

  return (
    <form action={action} className="grid gap-5">
      {saved ? <p className="notice">La receta del taller quedó guardada. Los siguientes logos la usan cuando abres una solicitud.</p> : null}
      {state?.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          Hilos de la base blanca
          <input className="field" name="baseMesh" defaultValue={rule.baseMesh} required />
        </label>
        <label className="field-label">
          Pasadas de la base
          <input className="field" name="basePasses" type="number" min={1} max={8} defaultValue={rule.basePasses} required />
        </label>
        <label className="field-label">
          Hilos de las tintas
          <input className="field" name="colorMesh" defaultValue={rule.colorMesh} required />
        </label>
        <label className="field-label">
          Pasadas de cada tinta
          <input className="field" name="colorPasses" type="number" min={1} max={8} defaultValue={rule.colorPasses} required />
        </label>
        <label className="field-label">
          Hilos si la línea es delgada
          <input className="field" name="fineMesh" defaultValue={rule.fineMesh} required />
        </label>
        <label className="field-label">
          Una línea es delgada si mide menos de (mm)
          <input className="field" name="fineThresholdMm" type="number" min={0.1} max={3} step={0.1} defaultValue={rule.fineThresholdMm} required />
        </label>
      </div>
      <label className="field-label">
        Nombres de tus botes
        <textarea
          className="field min-h-28"
          name="inkNamesText"
          defaultValue={inkNamesText}
          placeholder={"rojo = rojo 186\nnegro = negro cubriente"}
        />
      </label>
      <p className="text-sm text-ink-soft">Una línea por tinta: el nombre que detecta el separador, un igual, y cómo le dices tú al bote. El horno no se guarda aquí.</p>
      <button className="btn btn-primary justify-self-start" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar mi receta"}
      </button>
    </form>
  );
}

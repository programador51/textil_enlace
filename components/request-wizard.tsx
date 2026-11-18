"use client";

import Link from "next/link";
import { useState } from "react";
import { previewRequest, sendRequest, type PreviewData } from "@/app/actions/public";
import { MessageActions } from "@/components/message-actions";
import { SeparatorStudio } from "@/components/separator-studio";
import { ProcessChips } from "@/components/workshop-card";
import {
  DESIGN_OPTIONS,
  FABRIC_OPTIONS,
  ZONES,
  formatPhone,
  pieceLabel,
  sizeLabel,
} from "@/lib/labels";
import type { ArtPayload } from "@/lib/separator/payload";
import type { PublicGarment, PublicWorkshop, Receipt } from "@/lib/types";

const steps = [
  { id: "prenda", label: "Prenda" },
  { id: "diseno", label: "Diseño" },
  { id: "cuando", label: "Cuándo" },
  { id: "contacto", label: "Contacto" },
  { id: "talleres", label: "Talleres" },
] as const;

type Draft = {
  garmentSlug: string;
  garmentCustom: string;
  quantity: string;
  fabric: string;
  designClass: string;
  neededBy: string;
  zone: string;
  note: string;
  customerName: string;
  customerContact: string;
};

const emptyDraft: Draft = {
  garmentSlug: "",
  garmentCustom: "",
  quantity: "",
  fabric: "",
  designClass: "",
  neededBy: "",
  zone: "",
  note: "",
  customerName: "",
  customerContact: "",
};

function garmentName(draft: Draft, garments: PublicGarment[]) {
  if (draft.garmentSlug === "otra") return draft.garmentCustom.trim() || "Otra prenda";
  return garments.find((garment) => garment.slug === draft.garmentSlug)?.name ?? "Prenda";
}

function validateStep(step: number, draft: Draft) {
  if (step === 0) {
    if (!draft.garmentSlug) return "Elige la prenda.";
    if (draft.garmentSlug === "otra" && draft.garmentCustom.trim().length < 2) return "Escribe qué prenda es.";
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return "Escribe cuántas piezas necesitas.";
    if (!draft.fabric) return "Indica cómo es la tela, o marca que no lo sabes.";
  }
  if (step === 1 && !draft.designClass) return "Elige cómo es el diseño.";
  if (step === 2) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.neededBy)) return "Elige la fecha en que lo necesitas.";
    if (!draft.zone) return "Elige la zona.";
  }
  if (step === 3) {
    if (draft.customerName.trim().length < 2) return "Escribe tu nombre.";
    if (draft.customerContact.trim().length < 8) return "Escribe un teléfono o un correo.";
  }
  return null;
}

function artHint(art: ArtPayload | null) {
  if (!art) return null;
  return { kind: art.kind, inkCount: art.inkCount, reason: art.reason, fabric: art.fabric };
}

function payload(draft: Draft) {
  return {
    garmentSlug: draft.garmentSlug,
    garmentCustom: draft.garmentCustom,
    quantity: Number(draft.quantity),
    fabric: draft.fabric,
    designClass: draft.designClass,
    neededBy: draft.neededBy,
    zone: draft.zone,
    note: draft.note,
    customerName: draft.customerName.trim(),
    customerContact: draft.customerContact.trim(),
  };
}

export function RequestWizard({
  garments,
  initialWorkshopId,
}: {
  garments: PublicGarment[];
  initialWorkshopId: string;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selected, setSelected] = useState<string[]>(initialWorkshopId ? [initialWorkshopId] : []);
  const [showAll, setShowAll] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [art, setArt] = useState<ArtPayload | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function goNext() {
    const message = validateStep(step, draft);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    if (step === 3) {
      setPending(true);
      try {
        const result = await previewRequest({ ...payload(draft), artHint: artHint(art) });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPreview(result.data);
        const known = new Set([...result.data.suggested, ...result.data.others].map((workshop) => workshop.id));
        setSelected((current) => current.filter((id) => known.has(id)));
        setShowAll(result.data.suggested.length === 0);
      } catch {
        setError("No se pudo buscar talleres. Inténtalo de nuevo.");
        return;
      } finally {
        setPending(false);
      }
    }
    setStep((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (selected.length === 0) {
      setError("Elige al menos un taller. Puedes elegir varios: todos reciben el mismo texto.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await sendRequest({ ...payload(draft), workshopIds: selected, art });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReceipt(result.data);
    } catch {
      setError("No se pudo enviar la solicitud. Inténtalo de nuevo.");
      return;
    } finally {
      setPending(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (receipt) return <ReceiptView receipt={receipt} />;

  const highlighted = preview?.orientations.flatMap((item) => item.processes) ?? [];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <ol className="hidden gap-2 sm:grid sm:grid-cols-5" aria-label="Pasos">
          {steps.map((item, index) => (
            <li
              key={item.id}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-full px-3 py-2 text-center text-sm font-semibold ${
                index === step ? "bg-teal text-white" : index < step ? "bg-teal-soft text-teal" : "bg-card text-ink-soft"
              }`}
            >
              {item.label}
            </li>
          ))}
        </ol>
        <p className="text-sm font-semibold text-teal sm:hidden">
          Paso {step + 1} de {steps.length}: {steps[step].label}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-paper-deep sm:hidden" aria-hidden>
          <div className="h-full bg-teal" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="mt-6">
          {error ? (
            <p className="alert mb-4" role="alert">
              {error}
            </p>
          ) : null}

          {step === 0 ? (
            <section className="grid gap-5">
              <fieldset className="grid gap-3">
                <legend className="font-serif text-3xl">¿Qué prenda es?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {garments.map((garment) => (
                    <label key={garment.slug} className="panel flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="garment"
                        value={garment.slug}
                        checked={draft.garmentSlug === garment.slug}
                        onChange={() => update("garmentSlug", garment.slug)}
                      />
                      {garment.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              {draft.garmentSlug === "otra" ? (
                <label className="field-label">
                  ¿Cuál prenda?
                  <input className="field" value={draft.garmentCustom} onChange={(event) => update("garmentCustom", event.target.value)} />
                </label>
              ) : null}
              <label className="field-label">
                ¿Cuántas piezas?
                <input
                  className="field"
                  inputMode="numeric"
                  value={draft.quantity}
                  onChange={(event) => update("quantity", event.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
              <fieldset className="grid gap-2">
                <legend className="font-semibold">¿La tela es clara u oscura?</legend>
                {FABRIC_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="fabric"
                      value={option.value}
                      checked={draft.fabric === option.value}
                      onChange={() => update("fabric", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="grid gap-4">
              <fieldset className="grid gap-3">
                <legend className="font-serif text-3xl">¿Cómo es el diseño?</legend>
                <div className="mt-3 grid gap-2">
                  {DESIGN_OPTIONS.map((option) => (
                    <label key={option.value} className="panel flex cursor-pointer gap-3">
                      <input
                        className="mt-1"
                        type="radio"
                        name="design"
                        value={option.value}
                        checked={draft.designClass === option.value}
                        onChange={() => update("designClass", option.value)}
                      />
                      <span>
                        <span className="block font-semibold">{option.label}</span>
                        <span className="mt-1 block text-sm text-ink-soft">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field-label">
                Nota libre
                <textarea
                  className="field min-h-28"
                  value={draft.note}
                  maxLength={500}
                  placeholder="Tallas, colores o para qué es la prenda. Si no quieres agregar nada, continúa."
                  onChange={(event) => update("note", event.target.value)}
                />
              </label>
              <SeparatorStudio
                mode="attach"
                fabricLock={draft.fabric === "CLARA" || draft.fabric === "OSCURA" ? draft.fabric : null}
                onArt={setArt}
              />
            </section>
          ) : null}

          {step === 2 ? (
            <section className="grid gap-5">
              <h2 className="font-serif text-3xl">¿Para cuándo y en qué zona?</h2>
              <label className="field-label">
                Fecha en que lo necesitas
                <input className="field" type="date" value={draft.neededBy} onChange={(event) => update("neededBy", event.target.value)} />
              </label>
              <label className="field-label">
                Zona de Monterrey o su área
                <select className="field" value={draft.zone} onChange={(event) => update("zone", event.target.value)}>
                  <option value="">Elige una zona</option>
                  {ZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="grid gap-5">
              <h2 className="font-serif text-3xl">¿Cómo te contacta el taller?</h2>
              <p className="text-ink-soft">
                Este dato se comparte solo con los talleres que elijas, para que puedan cotizarte. El sitio no publica tu contacto.
              </p>
              <label className="field-label">
                Tu nombre
                <input className="field" value={draft.customerName} onChange={(event) => update("customerName", event.target.value)} />
              </label>
              <label className="field-label">
                WhatsApp, teléfono o correo
                <input
                  className="field"
                  value={draft.customerContact}
                  onChange={(event) => update("customerContact", event.target.value)}
                />
              </label>
            </section>
          ) : null}

          {step === 4 && preview ? (
            <section className="grid gap-5">
              <div>
                <h2 className="font-serif text-3xl">Qué impresión suele usarse</h2>
                <p className="mt-2 text-ink-soft">
                  Esto es una orientación, no un precio. Nada de lo que escribiste te impide escribirle a otro taller.
                </p>
              </div>
              <div className="grid gap-3">
                {preview.orientations.map((item) => (
                  <article key={item.title} className="panel">
                    <h3 className="font-serif text-2xl">{item.title}</h3>
                    <p className="mt-2 leading-7">{item.explanation}</p>
                    <p className="mt-3 text-sm font-semibold text-teal">{item.processes.join(" · ")}</p>
                  </article>
                ))}
              </div>
              <p className="notice">En esta pantalla no hay un monto. Cada taller cotiza con sus precios y sus tiempos.</p>
              <WorkshopPicker
                title="Talleres que ofrecen esa impresión"
                workshops={preview.suggested}
                selected={selected}
                highlight={highlighted}
                onToggle={(id) =>
                  setSelected((current) =>
                    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                  )
                }
              />
              {preview.suggested.length === 0 ? (
                <p className="text-sm text-ink-soft">Ningún taller publicado marcó justo esos procesos. Puedes elegir desde la lista completa.</p>
              ) : null}
              <button type="button" className="btn btn-secondary justify-self-start" onClick={() => setShowAll((value) => !value)}>
                {showAll ? "Ocultar la lista completa" : "Ver la lista completa de talleres"}
              </button>
              {showAll ? (
                <WorkshopPicker
                  title="Todos los talleres participantes"
                  workshops={preview.others}
                  selected={selected}
                  onToggle={(id) =>
                    setSelected((current) =>
                      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                    )
                  }
                />
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <StepButtons
            step={step}
            pending={pending}
            selectedCount={selected.length}
            onBack={() => setStep((current) => current - 1)}
            onNext={() => void goNext()}
            onSubmit={() => void submit()}
          />
        </div>
      </div>

      <aside className="panel sticky top-24 hidden lg:block">
        <p className="text-xs font-bold tracking-wide text-gold uppercase">Tu encargo</p>
        <h2 className="mt-2 font-serif text-2xl">{garmentName(draft, garments)}</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <SummaryItem label="Cantidad" value={draft.quantity ? pieceLabel(Number(draft.quantity)) : "—"} />
          <SummaryItem label="Tela" value={FABRIC_OPTIONS.find((item) => item.value === draft.fabric)?.label ?? "—"} />
          <SummaryItem label="Diseño" value={DESIGN_OPTIONS.find((item) => item.value === draft.designClass)?.label ?? "—"} />
          <SummaryItem label="Logo" value={art ? (art.kind === "NO_ENTRA" ? "Sin capas" : art.kind === "CMYK" ? "Cuatricromía" : `${art.inkCount} tintas`) : "—"} />
          <SummaryItem label="Fecha" value={draft.neededBy || "—"} />
          <SummaryItem label="Zona" value={draft.zone || "—"} />
          <SummaryItem label="Talleres" value={selected.length ? String(selected.length) : "—"} />
        </dl>
        <p className="mt-4 text-sm text-ink-soft">Aquí no se calcula un precio.</p>
      </aside>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function StepButtons({
  step,
  pending,
  selectedCount,
  onBack,
  onNext,
  onSubmit,
}: {
  step: number;
  pending: boolean;
  selectedCount: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      {step > 0 ? (
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={pending}>
          Atrás
        </button>
      ) : (
        <span />
      )}
      {step < 4 ? (
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={pending}>
          {pending ? "Buscando talleres…" : "Continuar"}
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={pending}>
          {pending ? "Enviando…" : selectedCount === 1 ? "Enviar a 1 taller" : `Enviar a ${selectedCount} talleres`}
        </button>
      )}
    </>
  );
}

function WorkshopPicker({
  title,
  workshops,
  selected,
  highlight,
  onToggle,
}: {
  title: string;
  workshops: PublicWorkshop[];
  selected: string[];
  highlight?: string[];
  onToggle: (id: string) => void;
}) {
  if (workshops.length === 0) return null;
  return (
    <fieldset className="grid gap-3">
      <legend className="font-serif text-2xl">{title}</legend>
      <p className="text-sm text-ink-soft">Puedes elegir uno o varios. Todos reciben el mismo texto.</p>
      {workshops.map((workshop) => {
        const checked = selected.includes(workshop.id);
        return (
          <label key={workshop.id} className={`panel flex cursor-pointer gap-3 ${checked ? "border-teal bg-teal-soft" : ""}`}>
            <input className="mt-1" type="checkbox" checked={checked} onChange={() => onToggle(workshop.id)} />
            <span className="min-w-0">
              <span className="block font-serif text-xl">{workshop.name}</span>
              <span className="mt-1 block text-sm text-ink-soft">
                {sizeLabel(workshop.size)} · {workshop.zone} · {workshop.contactName} · {formatPhone(workshop.phone)}
              </span>
              <span className="mt-2 block text-sm leading-6">{workshop.phrase}</span>
              <span className="mt-3 block">
                <ProcessChips processes={workshop.processes} highlight={highlight} />
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-bold tracking-wide text-gold uppercase">Conexión enviada</p>
      <h2 className="mt-2 font-serif text-4xl">Los talleres elegidos tienen la misma solicitud.</h2>
      <p className="mt-3 leading-7 text-ink-soft">
        Cada uno cotiza por su medio. Este sitio no guarda un monto. Enviar la solicitud no es un contrato ni una venta.
      </p>
      <div className="panel mt-6 border-dashed text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-teal uppercase">Folio</p>
        <p className="mt-2 font-serif text-4xl">{receipt.folio}</p>
        <Link className="mt-3 inline-block font-semibold text-dye" href={`/folio/${receipt.folio}`}>
          Volver a abrir este folio
        </Link>
      </div>
      <ul className="mt-6 grid gap-4">
        {receipt.workshops.map((workshop) => (
          <li key={workshop.id} className="panel">
            <h3 className="font-serif text-2xl">{workshop.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">{workshop.zone}</p>
            <div className="mt-4">
              <MessageActions phone={workshop.phone} message={receipt.message} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-soft">Si el enlace no abre, copia el mensaje y mándalo por el medio del taller.</p>
    </section>
  );
}

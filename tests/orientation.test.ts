import assert from "node:assert/strict";
import test from "node:test";
import { matchOrientation, suggestedProcessSlugs, sortForRequest } from "../lib/orientation";

const processes = {
  serigrafia: { slug: "serigrafia", name: "Serigrafía" },
  dtf: { slug: "dtf", name: "DTF" },
  dtg: { slug: "dtg", name: "DTG" },
  sublimacion: { slug: "sublimacion", name: "Sublimación" },
  vinil: { slug: "vinil", name: "Vinil textil" },
};

const rules = [
  {
    slug: "pocas-piezas",
    title: "Pocas piezas",
    explanation: "DTF, DTG o vinil.",
    sortOrder: 10,
    conditions: { maxQuantity: 12 },
    processes: [processes.dtf, processes.dtg, processes.vinil],
  },
  {
    slug: "varias-pocos-colores",
    title: "Varias piezas",
    explanation: "Serigrafía.",
    sortOrder: 20,
    conditions: { minQuantity: 13, designClasses: ["POCOS_COLORES"] },
    processes: [processes.serigrafia],
  },
  {
    slug: "foto",
    title: "Foto",
    explanation: "DTF o DTG.",
    sortOrder: 30,
    conditions: { designClasses: ["FOTO"] },
    processes: [processes.dtf, processes.dtg],
  },
  {
    slug: "uniforme",
    title: "Uniforme",
    explanation: "Sublimación.",
    sortOrder: 40,
    conditions: { garmentSlugs: ["uniforme"] },
    processes: [processes.sublimacion],
  },
  {
    slug: "nombre-numero",
    title: "Nombre y número",
    explanation: "Vinil o DTF.",
    sortOrder: 50,
    conditions: { designClasses: ["NOMBRE_NUMERO"] },
    processes: [processes.vinil, processes.dtf],
  },
  {
    slug: "cercanos",
    title: "Cercanos",
    explanation: "Lista completa.",
    sortOrder: 90,
    conditions: { fallback: true },
    processes: Object.values(processes),
  },
];

const base = { fabric: "CLARA", garmentSlug: "playera" };

test("pocas piezas no sugiere serigrafía", () => {
  const matched = matchOrientation(rules, { ...base, quantity: 4, designClass: "POCOS_COLORES" });
  assert.deepEqual(matched.map((rule) => rule.slug), ["pocas-piezas"]);
});

test("varias piezas y pocos colores sugiere serigrafía", () => {
  const matched = matchOrientation(rules, { ...base, quantity: 24, designClass: "POCOS_COLORES" });
  assert.deepEqual(matched.map((rule) => rule.slug), ["varias-pocos-colores"]);
});

test("una foto de pocas piezas junta las dos orientaciones", () => {
  const matched = matchOrientation(rules, { ...base, quantity: 8, designClass: "FOTO" });
  assert.deepEqual(matched.map((rule) => rule.slug), ["pocas-piezas", "foto"]);
  assert.deepEqual(suggestedProcessSlugs(matched), ["dtf", "dtg", "vinil"]);
});

test("uniforme y foto no usan el caso de reserva", () => {
  const matched = matchOrientation(rules, {
    quantity: 30,
    designClass: "FOTO",
    fabric: "CLARA",
    garmentSlug: "uniforme",
  });
  assert.deepEqual(matched.map((rule) => rule.slug), ["foto", "uniforme"]);
});

test("sin un caso claro usa la orientación de reserva", () => {
  const matched = matchOrientation(rules, { ...base, quantity: 40, designClass: "SIN_ARCHIVO" });
  assert.deepEqual(matched.map((rule) => rule.slug), ["cercanos"]);
});

test("el orden de talleres sigue a los procesos sugeridos y luego al nombre", () => {
  const workshops = [
    { name: "Zeta", processes: [{ slug: "serigrafia" }] },
    { name: "Beta", processes: [{ slug: "dtf" }, { slug: "dtg" }] },
    { name: "Alfa", processes: [{ slug: "dtf" }] },
  ];
  const ordered = sortForRequest(workshops, ["dtf", "dtg"]);
  assert.deepEqual(ordered.map((workshop) => workshop.name), ["Beta", "Alfa", "Zeta"]);
});

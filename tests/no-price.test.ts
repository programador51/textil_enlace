import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const forbidden = /\b(price|precio|tarifa|costo|cost|margen|margin|monto|amount|total|fee|rate)\b/i;

function schemaLines() {
  return readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("///");
    });
}

test("el esquema no tiene campos de precio, margen ni total", () => {
  const hits = schemaLines().filter((line) => forbidden.test(line));
  assert.deepEqual(hits, []);
});

import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const desktop = path.dirname(fileURLToPath(import.meta.url));
const project = path.dirname(desktop);
const dist = path.join(desktop, "dist");
const app = path.join(dist, "app");
const EMBEDDED_POSTGRES = "18.6.0-beta.19";
const APP_URL = "http://localhost:3210";
const shell = process.platform === "win32";

step("Compilando el sitio");
run("npx", ["next", "build"], project, {
  TEXTILENLACE_DESKTOP: "1",
  NEXT_PUBLIC_APP_URL: APP_URL,
  NEXT_TELEMETRY_DISABLED: "1",
});

step("Copiando el sitio compilado");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(path.join(project, ".next", "standalone"), app, {
  recursive: true,
  dereference: true,
  filter: (source) => !/\.tmp\d+$/.test(source),
});
cpSync(path.join(project, ".next", "static"), path.join(app, ".next", "static"), { recursive: true });
cpSync(path.join(project, "public"), path.join(app, "public"), { recursive: true });
cpSync(path.join(project, "prisma", "migrations"), path.join(app, "migrations"), {
  recursive: true,
  filter: (source) => !source.endsWith("migration_lock.toml"),
});
for (const leftover of [".env", ".env.local"]) rmSync(path.join(app, leftover), { force: true });

step("Preparando los datos de demostración");
await build({
  entryPoints: [path.join(project, "prisma", "seed.ts")],
  outfile: path.join(app, "seed.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["@prisma/client", ".prisma/client"],
  logLevel: "warning",
});
if (!existsSync(path.join(app, "node_modules", "@prisma", "client"))) {
  throw new Error("El build no incluyó @prisma/client en app/node_modules.");
}

step("Incluyendo PostgreSQL");
const db = path.join(dist, "db");
mkdirSync(db, { recursive: true });
writeFileSync(
  path.join(db, "package.json"),
  JSON.stringify({ private: true, dependencies: { "embedded-postgres": EMBEDDED_POSTGRES } }, null, 2),
);
run("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], db);

step("Incluyendo Node.js");
mkdirSync(path.join(dist, "runtime"), { recursive: true });
copyFileSync(process.execPath, path.join(dist, "runtime", "node.exe"));
copyFileSync(path.join(desktop, "launcher.mjs"), path.join(dist, "launcher.mjs"));

step("Armando el instalador");
const iscc = findIscc();
if (!iscc) {
  console.log("No se encontró ISCC.exe. Instala Inno Setup 6 y compila desktop/textilenlace.iss.");
  process.exit(0);
}
execFileSync(iscc, [path.join(desktop, "textilenlace.iss")], { stdio: "inherit" });
console.log(`\nInstalador listo en ${path.join(desktop, "output")}`);

function step(label) {
  console.log(`\n== ${label}`);
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell, env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} terminó con ${result.status}`);
}

function findIscc() {
  const candidates = [
    process.env.ISCC,
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Inno Setup 6", "ISCC.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Inno Setup 6", "ISCC.exe"),
    path.join(process.env.ProgramFiles ?? "", "Inno Setup 6", "ISCC.exe"),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

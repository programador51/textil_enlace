import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(root, "app");
const dbModules = path.join(root, "db", "node_modules");
const home = path.join(process.env.LOCALAPPDATA ?? root, "TextilEnlace");
const dataDir = path.join(home, "pgdata");
const configFile = path.join(home, "config.json");
const APP_PORT = 3210;
const DB_PORT = 54329;
const APP_URL = `http://localhost:${APP_PORT}`;

const { default: EmbeddedPostgres } = await import(pathToImport(path.join(dbModules, "embedded-postgres", "dist", "index.js")));
const { default: pg } = await import(pathToImport(path.join(dbModules, "pg", "lib", "index.js")));

mkdirSync(home, { recursive: true });
const config = readConfig();

console.log("TextilEnlace, sin conexión a internet.");
console.log("No cierres esta ventana mientras usas el sitio. Al cerrarla, el sitio se apaga.\n");

if (await portInUse(APP_PORT)) {
  console.log(`TextilEnlace ya está abierto. Abriendo ${APP_URL}`);
  openBrowser(APP_URL);
  process.exit(0);
}

const database = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "textilenlace",
  password: config.dbPassword,
  port: DB_PORT,
  persistent: true,
  onLog: () => {},
  onError: () => {},
});

const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));
const databaseRunning = !firstRun && (await portInUse(DB_PORT));
console.log(firstRun ? "Preparando la base de datos por primera vez…" : "Iniciando la base de datos…");
if (firstRun) await database.initialise();
if (!databaseRunning) await database.start();

let server = null;
const shutdown = async () => {
  if (server && !server.killed) server.kill();
  try {
    if (databaseRunning) await stopOrphanedDatabase();
    else await database.stop();
  } catch {}
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

try {
  await ensureDatabase();
  const databaseUrl = `postgresql://textilenlace:${encodeURIComponent(config.dbPassword)}@localhost:${DB_PORT}/textilenlace`;
  await migrate(databaseUrl);
  if (!config.seeded) {
    console.log("Cargando los talleres de demostración…");
    await runNode(path.join(appDir, "seed.cjs"), { DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl });
    config.seeded = true;
    writeFileSync(configFile, JSON.stringify(config, null, 2));
  }

  console.log("Iniciando el sitio…");
  server = spawn(process.execPath, [path.join(appDir, "server.js")], {
    cwd: appDir,
    stdio: ["ignore", "inherit", "inherit"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(APP_PORT),
      HOSTNAME: "localhost",
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      AUTH_SECRET: config.authSecret,
      NEXT_PUBLIC_APP_URL: APP_URL,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  server.on("exit", () => void shutdown());

  await waitForPort(APP_PORT, 60_000);
  console.log(`\nListo: ${APP_URL}`);
  console.log("Cuenta de taller de prueba: norte@demo.textilenlace.mx, contraseña TextilEnlace.demo");
  openBrowser(APP_URL);
} catch (error) {
  console.error("\nNo se pudo iniciar TextilEnlace:", error instanceof Error ? error.message : error);
  await shutdown();
}

function readConfig() {
  if (existsSync(configFile)) return JSON.parse(readFileSync(configFile, "utf8"));
  const fresh = {
    dbPassword: randomBytes(18).toString("hex"),
    authSecret: randomBytes(32).toString("hex"),
    seeded: false,
  };
  writeFileSync(configFile, JSON.stringify(fresh, null, 2));
  return fresh;
}

async function ensureDatabase() {
  try {
    await database.createDatabase("textilenlace");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
  }
}

async function migrate(connectionString) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS "_desktop_migrations" ("name" TEXT PRIMARY KEY, "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    const done = new Set((await client.query('SELECT "name" FROM "_desktop_migrations"')).rows.map((row) => row.name));
    const folder = path.join(appDir, "migrations");
    const names = readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const name of names) {
      if (done.has(name)) continue;
      console.log(`Aplicando ${name}…`);
      await client.query(readFileSync(path.join(folder, name, "migration.sql"), "utf8"));
      await client.query('INSERT INTO "_desktop_migrations" ("name") VALUES ($1)', [name]);
    }
  } finally {
    await client.end();
  }
}

function runNode(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: appDir,
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, ...env },
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(script)} terminó con ${code}`))));
  });
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "localhost" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await portInUse(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("El sitio tardó demasiado en arrancar.");
}

function stopOrphanedDatabase() {
  const pgCtl = path.join(dbModules, "@embedded-postgres", "windows-x64", "native", "bin", "pg_ctl.exe");
  return new Promise((resolve) => {
    const child = spawn(pgCtl, ["stop", "-D", dataDir, "-m", "fast"], { stdio: "ignore" });
    child.on("exit", () => resolve());
    child.on("error", () => resolve());
  });
}

function openBrowser(url) {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
}

function pathToImport(file) {
  return new URL(`file:///${file.replace(/\\/g, "/")}`).href;
}

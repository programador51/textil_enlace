import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} salió con código ${code}`));
    });
  });
}

async function migrateWithRetry() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await run("npx", ["prisma", "migrate", "deploy"]);
      return;
    } catch (error) {
      console.log(`Base de datos no lista (intento ${attempt}). ${error instanceof Error ? error.message : ""}`);
      await delay(2000);
    }
  }
  throw new Error("No se pudo aplicar las migraciones.");
}

await run("npm", ["install"]);

await run("npx", ["prisma", "generate"]);
await migrateWithRetry();
await run("npx", ["prisma", "db", "seed"]);
await run("npm", ["run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]);

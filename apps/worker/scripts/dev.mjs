/**
 * Loads monorepo `.env` files, maps DATABASE_URL → Wrangler Hyperdrive local connection,
 * and writes `.dev.vars` for worker bindings (ALLOWED_ORIGINS, SESSION_COOKIE_NAME).
 */
import { config } from "dotenv";
import { spawn } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "..");
const repoRoot = resolve(workerRoot, "../..");

for (const envPath of [resolve(repoRoot, ".env"), resolve(workerRoot, ".env")]) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
  }
}

const explicit = process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();
if (explicit) {
  process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB = explicit;
} else if (databaseUrl) {
  process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB = databaseUrl;
}

const devVarEntries = [];
if (process.env.ALLOWED_ORIGINS?.trim()) {
  devVarEntries.push(["ALLOWED_ORIGINS", process.env.ALLOWED_ORIGINS.trim()]);
}
if (process.env.SESSION_COOKIE_NAME?.trim()) {
  devVarEntries.push(["SESSION_COOKIE_NAME", process.env.SESSION_COOKIE_NAME.trim()]);
}

const devVarsPath = resolve(workerRoot, ".dev.vars");
if (devVarEntries.length > 0) {
  const lines = devVarEntries.map(([key, value]) => `${key}=${quoteDevVar(value)}`);
  writeFileSync(devVarsPath, `${lines.join("\n")}\n`, "utf8");
} else if (existsSync(devVarsPath)) {
  try {
    unlinkSync(devVarsPath);
  } catch {
    /* ignore */
  }
}

function quoteDevVar(value) {
  if (/[\s#"']/.test(value) || value.includes(",")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

const wranglerJs = resolve(repoRoot, "node_modules/wrangler/bin/wrangler.js");
const proc = spawn(process.execPath, [wranglerJs, "dev", "--port", "8787"], {
  cwd: workerRoot,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

proc.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});

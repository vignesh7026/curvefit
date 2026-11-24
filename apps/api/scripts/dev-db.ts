/**
 * Local MongoDB for development and end-to-end tests (no Docker or install needed).
 * Downloads a mongod binary once (via mongodb-memory-server), then runs it against
 * apps/api/.data so data persists. Listens on 127.0.0.1:27017.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { MongoBinary } from "mongodb-memory-server";

const dbPath = process.env.DEV_DB_PATH ?? join(__dirname, "..", ".data");
const port = process.env.DEV_DB_PORT ?? "27017";
mkdirSync(dbPath, { recursive: true });

async function main() {
  const bin = await MongoBinary.getPath();
  const child = spawn(bin, ["--dbpath", dbPath, "--port", port, "--bind_ip", "127.0.0.1"], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.warn(`dev mongo starting on mongodb://127.0.0.1:${port}`);
  const stop = () => child.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

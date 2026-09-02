import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { openDb } from "./db.js";
import { loadIssuers } from "./issuers.js";
import { AlertService } from "./alertService.js";
import { createServer } from "./server.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.LIGTAS_DB_PATH ?? join(HERE, "..", "hub.sqlite");
const ISSUERS_PATH = process.env.LIGTAS_ISSUERS_PATH ?? join(HERE, "..", "config", "issuers.json");

const db = openDb(DB_PATH);
const issuers = loadIssuers(ISSUERS_PATH);
const alerts = new AlertService(db, issuers);
const app = createServer(alerts);

app.listen(PORT, () => {
  console.log(`hub listening on :${PORT} (db: ${DB_PATH}, ${issuers.size} issuer(s) loaded)`);
});

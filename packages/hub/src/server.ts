import express, { type Express } from "express";
import { AlertService } from "./alertService.js";

export function createServer(alerts: AlertService): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // The wire boundary PRD Section 5.5 left open: packages/mesh-sim POSTs
  // the raw packet hex it observed arriving at the hub node in the mesh.
  // Nothing above this line has any idea what LoRa or Meshtastic are.
  app.post("/alert", async (req, res) => {
    const packetHex = req.body?.packetHex;
    if (typeof packetHex !== "string") {
      res.status(400).json({ decision: "malformed", reason: "expected { packetHex: string }" });
      return;
    }
    const result = await alerts.ingest(packetHex);
    const status = result.decision === "accepted" ? 201 : result.decision === "malformed" ? 400 : 200;
    res.status(status).json(result);
  });

  app.get("/alerts", (_req, res) => {
    res.json(alerts.toBundle());
  });

  return app;
}

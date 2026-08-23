import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { storage } from "./storage";
import { insertBuildSchema, insertEstimateSchema } from "@shared/schema";

// Wagoner PD estimate #1233 (pulled live from QuickBooks, Id 2439). Seeded on
// startup so the app can auto-build from it out of the box. Additional
// estimates are imported by the operator via POST /api/estimates.
const WAGONER_SEED = {
  docNumber: "1233",
  customer: "Chief Bob Haley",
  agency: "Wagoner Police Department",
  state: "OK",
  memo: "Assumes 26 Ford PIU. No rear stick. No cage. Slicktop.",
  total: 11670.72,
  lines: [
    { itemName: "MPS63U-RBW", description: "MPS63U-RBW (grille)", qty: 4, amount: 556 },
    { itemName: "LIGHTS:MPSW9-RBW", description: "MPSW9 Wide angle tri color mirror light", qty: 2, amount: 374.88 },
    { itemName: "BRACKETS:FPIU20MIR", description: "FPIU20MIR-FORD Mirror mount (both sides)", qty: 1, amount: 74.7 },
    { itemName: "LIGHTS:SIFMJS-FPIU20-P3", description: "FedSig Ford PIU Tri-color visor(s)", qty: 1, amount: 1975 },
    { itemName: "PF200", description: "PF200 Siren controller (included)", qty: 1, amount: 0 },
    { itemName: "ES100C", description: "DynaMax ES100C Speaker/100 W (included)", qty: 1, amount: 0 },
    { itemName: "BRACKETS:ESBL-FPIU20", description: "ESBL-FPIU20 combo bracket", qty: 1, amount: 0 },
    { itemName: "OBDFORD", description: "OBDFORD", qty: 1, amount: 185.29 },
    { itemName: "EXPMOD24", description: "EXPMOD24 24 port expansion module", qty: 1, amount: 244.07 },
    { itemName: "Jotto:425-6505", description: "425-6505 Jotto desk contour console w/o printer", qty: 1, amount: 575.1 },
    { itemName: "Jotto:425-6287", description: "425-6287 Jotto PF-200 plate", qty: 1, amount: 49.94 },
    { itemName: "Jotto:425-6619", description: "425-6619 Harris XG-75M plate", qty: 1, amount: 49.49 },
    { itemName: "Services", description: "Ram Intelliskin iPad mount", qty: 1, amount: 391.77 },
    { itemName: "Jotto:475-0653", description: "475-0653 Jotto GR6 Dual gun mount No partition", qty: 1, amount: 688.44 },
    { itemName: "XSM2-BRW-US", description: "XSM2-BRW-US", qty: 2, amount: 389.54 },
    { itemName: "LIGHTS:Fed Sig COM9-B Interior Light", description: "Fed Sig COM9-B Interior Light", qty: 1, amount: 94.1 },
    { itemName: "SIFMJH-FPIU20-P3", description: "SIFMJH-FPIU20-P3 FIU Rear Hatch", qty: 1, amount: 977 },
    { itemName: "416300-B", description: "416300-B Blue 1 inch rear hatch light", qty: 2, amount: 154.2 },
    { itemName: "LIGHTS:416300-R", description: "416300-R Red 1 inch rear hatch light", qty: 2, amount: 154.2 },
    { itemName: "MPS123U-RBW", description: "MPS123U-RBW (rear hatch)", qty: 2, amount: 298 },
    { itemName: "RADAR:DECATUR G3", description: "DECATUR G3", qty: 1, amount: 2689 },
    { itemName: "Labor", description: "Labor/installation/supplies", qty: 1, amount: 1750 },
  ],
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed the Wagoner #1233 estimate once so Auto-Build works on a fresh DB.
  try {
    const existing = await storage.getEstimate(WAGONER_SEED.docNumber);
    if (!existing) {
      await storage.saveEstimate({
        docNumber: WAGONER_SEED.docNumber,
        data: JSON.stringify(WAGONER_SEED),
      });
    }
  } catch (e) {
    console.error("estimate seed failed", e);
  }

  // ---- Imported QuickBooks estimates ----

  // List imported estimate numbers (doc number + agency label, no line data).
  app.get("/api/estimates", async (_req, res) => {
    const all = await storage.listEstimates();
    res.json(
      all.map((e) => {
        let agency = "";
        let customer = "";
        try {
          const d = JSON.parse(e.data);
          agency = d.agency ?? "";
          customer = d.customer ?? "";
        } catch {}
        return { docNumber: e.docNumber, agency, customer, updatedAt: e.updatedAt };
      }),
    );
  });

  // Get one estimate by doc number (full parsed Estimate payload).
  app.get("/api/estimates/:num", async (req, res) => {
    const est = await storage.getEstimate(req.params.num.trim());
    if (!est) {
      return res.status(404).json({
        error: "not_imported",
        message:
          `Estimate #${req.params.num} has not been imported yet. Ask your ` +
          `Perplexity assistant to pull it live from QuickBooks.`,
      });
    }
    try {
      res.json({ docNumber: est.docNumber, ...JSON.parse(est.data) });
    } catch {
      res.status(500).json({ error: "corrupt_estimate" });
    }
  });

  // Import (upsert) an estimate. Body: { docNumber, data } where data is the
  // JSON-stringified Estimate object.
  app.post("/api/estimates", async (req, res) => {
    const parsed = insertEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid estimate", details: parsed.error.flatten() });
    }
    const saved = await storage.saveEstimate(parsed.data);
    res.json({ docNumber: saved.docNumber, updatedAt: saved.updatedAt });
  });

  // ---- Saved lighting builds ----

  // List all saved builds (name + updatedAt only, no heavy data payload).
  app.get("/api/builds", async (_req, res) => {
    const all = await storage.listBuilds();
    res.json(
      all.map((b) => ({ id: b.id, name: b.name, updatedAt: b.updatedAt })),
    );
  });

  // Get one build by name (full data payload).
  app.get("/api/builds/:name", async (req, res) => {
    const build = await storage.getBuild(req.params.name);
    if (!build) return res.status(404).json({ error: "Build not found" });
    res.json(build);
  });

  // Save (upsert) a build by name.
  app.post("/api/builds", async (req, res) => {
    const parsed = insertBuildSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid build", details: parsed.error.flatten() });
    }
    const saved = await storage.saveBuild(parsed.data);
    res.json(saved);
  });

  // Delete a build by name.
  app.delete("/api/builds/:name", async (req, res) => {
    const ok = await storage.deleteBuild(req.params.name);
    if (!ok) return res.status(404).json({ error: "Build not found" });
    res.json({ ok: true });
  });

  return httpServer;
}

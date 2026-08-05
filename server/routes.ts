import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { storage } from "./storage";
import { insertBuildSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Saved lighting builds, keyed by a customer/department name. `data` holds the
// serialized build state (vehicleId, params, placed nodes) as JSON text.
export const builds = sqliteTable("builds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const insertBuildSchema = createInsertSchema(builds)
  .pick({ name: true, data: true })
  .extend({
    name: z.string().trim().min(1, "Name is required").max(80),
    data: z.string().min(2),
  });

export type InsertBuild = z.infer<typeof insertBuildSchema>;
export type Build = typeof builds.$inferSelect;

// Imported QuickBooks estimates, keyed by their DocNumber (e.g. "1233"). `data`
// holds the serialized Estimate object (customer, agency, memo, total, lines) as
// JSON text. Estimates are pulled live from QuickBooks by the operator and
// cached here so the visualizer can auto-build from any imported estimate #.
export const estimates = sqliteTable("estimates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  docNumber: text("doc_number").notNull().unique(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const insertEstimateSchema = createInsertSchema(estimates)
  .pick({ docNumber: true, data: true })
  .extend({
    docNumber: z.string().trim().min(1, "Estimate number is required").max(40),
    data: z.string().min(2),
  });

export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

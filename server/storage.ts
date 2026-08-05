import { users, builds } from '@shared/schema';
import type { User, InsertUser, Build, InsertBuild } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Ensure tables exist even on a fresh deploy where `db:push` hasn't run.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listBuilds(): Promise<Build[]>;
  getBuild(name: string): Promise<Build | undefined>;
  saveBuild(build: InsertBuild): Promise<Build>;
  deleteBuild(name: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async listBuilds(): Promise<Build[]> {
    return db.select().from(builds).orderBy(desc(builds.updatedAt)).all();
  }

  async getBuild(name: string): Promise<Build | undefined> {
    return db.select().from(builds).where(eq(builds.name, name)).get();
  }

  // Upsert by name: overwrite an existing build with the same name, else insert.
  async saveBuild(insertBuild: InsertBuild): Promise<Build> {
    const now = Date.now();
    const existing = await this.getBuild(insertBuild.name);
    if (existing) {
      return db
        .update(builds)
        .set({ data: insertBuild.data, updatedAt: now })
        .where(eq(builds.name, insertBuild.name))
        .returning()
        .get();
    }
    return db
      .insert(builds)
      .values({ ...insertBuild, updatedAt: now })
      .returning()
      .get();
  }

  async deleteBuild(name: string): Promise<boolean> {
    const res = db.delete(builds).where(eq(builds.name, name)).run();
    return res.changes > 0;
  }
}

export const storage = new DatabaseStorage();

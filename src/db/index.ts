import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

// Cached on globalThis so dev hot-reloads reuse one connection (PGlite allows a single instance per data folder).
const globalForDb = globalThis as unknown as { dbPromise?: Promise<DB> };

async function connect(): Promise<DB> {
  // Production and preview: Neon serverless Postgres over HTTP.
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(process.env.DATABASE_URL), { schema }) as unknown as DB;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production.");
  }
  // Local development: an embedded Postgres (PGlite) stored in ./.pglite, migrated on startup. No install needed.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = drizzle(new PGlite(".pglite"), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  globalForDb.dbPromise ??= connect().catch((error) => {
    globalForDb.dbPromise = undefined;
    throw error;
  });
  return globalForDb.dbPromise;
}

export { schema };

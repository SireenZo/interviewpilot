// Applies database migrations before a production build. Skipped when DATABASE_URL is not set
// (local development migrates its embedded database on startup instead).
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not set; skipping migrations.");
  process.exit(0);
}

await migrate(drizzle(neon(process.env.DATABASE_URL)), { migrationsFolder: "drizzle" });
console.log("Database migrations applied.");

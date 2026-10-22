import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { DeliveryMetrics } from "@/lib/metrics";
import type { Scorecard } from "@/lib/scorecard";
import type { InterviewSetup, Turn } from "@/lib/types";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    email: text("email"),
    name: text("name"),
    image: text("image"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_provider_account_idx").on(t.provider, t.providerAccountId)],
);

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    roleTitle: text("role_title").notNull(),
    setup: jsonb("setup").$type<InterviewSetup>().notNull(),
    transcript: jsonb("transcript").$type<Turn[]>().notNull(),
    scorecard: jsonb("scorecard").$type<Scorecard>().notNull(),
    metrics: jsonb("metrics").$type<DeliveryMetrics>().notNull(),
    overallScore: integer("overall_score").notNull(),
    durationSec: integer("duration_sec").notNull(),
    demo: boolean("demo").notNull().default(false),
    /** Set when the owner creates a public share link. */
    shareId: text("share_id").unique(),
  },
  (t) => [index("interviews_user_created_idx").on(t.userId, t.createdAt)],
);

/** One row per metered action, used for daily limits that protect the API budget. */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("usage_user_kind_created_idx").on(t.userId, t.kind, t.createdAt)],
);

export type InterviewRow = typeof interviews.$inferSelect;

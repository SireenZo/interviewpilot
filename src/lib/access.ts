import { and, count, eq, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/db";

/** Daily per-user limits that keep a public deployment from running up the API bill. */
export const DAILY_LIMITS = {
  interview: Number(process.env.DAILY_INTERVIEW_LIMIT ?? 5),
  turn: 300,
  grade: 10,
  pdf: 10,
} as const;

export type UsageKind = keyof typeof DAILY_LIMITS;

const LIMIT_MESSAGE: Record<UsageKind, string> = {
  interview: `You've reached today's limit of ${DAILY_LIMITS.interview} AI interviews. Come back tomorrow, or practise in demo mode.`,
  turn: "You've reached today's usage limit. Please come back tomorrow.",
  grade: "You've reached today's scorecard limit. Please come back tomorrow.",
  pdf: "You've reached today's CV upload limit. Paste your CV as text instead.",
};

export type Access =
  | { mode: "ai"; userId: string }
  | { mode: "demo"; userId: string | null }
  | { mode: "limited"; message: string };

export async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Decides whether a request may use the real AI. Guests and deployments without an API key get the free demo;
 * signed-in users get the AI until they hit a daily limit. Allowed uses are recorded.
 */
export async function aiAccess(kind: UsageKind): Promise<Access> {
  const userId = await currentUserId();
  if (!process.env.ANTHROPIC_API_KEY || !userId) return { mode: "demo", userId };

  const db = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ used }] = await db
    .select({ used: count() })
    .from(schema.usageEvents)
    .where(and(eq(schema.usageEvents.userId, userId), eq(schema.usageEvents.kind, kind), gte(schema.usageEvents.createdAt, since)));
  if (used >= DAILY_LIMITS[kind]) return { mode: "limited", message: LIMIT_MESSAGE[kind] };

  await db.insert(schema.usageEvents).values({ userId, kind });
  return { mode: "ai", userId };
}

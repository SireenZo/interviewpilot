import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARE_ID = /^[A-Za-z0-9_-]{10,40}$/;

export async function listInterviews(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: schema.interviews.id,
      createdAt: schema.interviews.createdAt,
      roleTitle: schema.interviews.roleTitle,
      overallScore: schema.interviews.overallScore,
      durationSec: schema.interviews.durationSec,
      demo: schema.interviews.demo,
      setup: schema.interviews.setup,
      scorecard: schema.interviews.scorecard,
    })
    .from(schema.interviews)
    .where(eq(schema.interviews.userId, userId))
    .orderBy(desc(schema.interviews.createdAt))
    .limit(100);
}

/** Returns the interview only if it belongs to the user. */
export async function getInterview(id: string, userId: string) {
  if (!UUID.test(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.interviews)
    .where(and(eq(schema.interviews.id, id), eq(schema.interviews.userId, userId)));
  return row ?? null;
}

export async function getSharedInterview(shareId: string) {
  if (!SHARE_ID.test(shareId)) return null;
  const db = await getDb();
  const [row] = await db.select().from(schema.interviews).where(eq(schema.interviews.shareId, shareId));
  return row ?? null;
}

/** Creates (or returns the existing) public share id for the user's interview. */
export async function shareInterview(id: string, userId: string) {
  const row = await getInterview(id, userId);
  if (!row) return null;
  if (row.shareId) return row.shareId;
  const shareId = randomBytes(12).toString("base64url");
  const db = await getDb();
  await db.update(schema.interviews).set({ shareId }).where(eq(schema.interviews.id, row.id));
  return shareId;
}

export async function unshareInterview(id: string, userId: string) {
  if (!UUID.test(id)) return false;
  const db = await getDb();
  const rows = await db
    .update(schema.interviews)
    .set({ shareId: null })
    .where(and(eq(schema.interviews.id, id), eq(schema.interviews.userId, userId)))
    .returning({ id: schema.interviews.id });
  return rows.length > 0;
}

export async function deleteInterview(id: string, userId: string) {
  if (!UUID.test(id)) return false;
  const db = await getDb();
  const rows = await db
    .delete(schema.interviews)
    .where(and(eq(schema.interviews.id, id), eq(schema.interviews.userId, userId)))
    .returning({ id: schema.interviews.id });
  return rows.length > 0;
}

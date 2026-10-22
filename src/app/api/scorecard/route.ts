import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { aiAccess } from "@/lib/access";
import { GraderError, gradeInterview } from "@/lib/grader";
import { parseSetup, parseTranscript } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** A short title for the dashboard: the first meaningful line of the job description. */
function roleTitle(jobText: string) {
  const line = jobText.split("\n").map((l) => l.trim()).find((l) => l.length > 2) ?? "Interview";
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

/** Grades a finished interview and, for signed-in users, saves it to their history. */
export async function POST(req: Request) {
  let body: { setup?: unknown; transcript?: unknown; durationSec?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const setup = parseSetup(body.setup);
  if (typeof setup === "string") return fail(setup, 400);
  const transcript = parseTranscript(body.transcript);
  if (typeof transcript === "string") return fail(transcript, 400);
  const durationSec = typeof body.durationSec === "number" ? Math.max(0, Math.min(4 * 3600, Math.round(body.durationSec))) : 0;

  const access = await aiAccess("grade");
  if (access.mode === "limited") return fail(access.message, 429);

  try {
    const result = await gradeInterview(setup, transcript, access.mode === "ai");
    if (!access.userId) return NextResponse.json(result);

    const db = await getDb();
    const [row] = await db
      .insert(schema.interviews)
      .values({
        userId: access.userId,
        roleTitle: roleTitle(setup.jobText),
        setup,
        transcript,
        scorecard: result.scorecard,
        metrics: result.metrics,
        overallScore: result.scorecard.overallScore,
        durationSec,
        demo: result.demo,
      })
      .returning({ id: schema.interviews.id });
    return NextResponse.json({ ...result, id: row.id });
  } catch (error) {
    if (error instanceof GraderError) return fail(error.message, error.status);
    console.error(error);
    return fail("Something went wrong. Please try again.", 500);
  }
}

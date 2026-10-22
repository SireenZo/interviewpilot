import { NextResponse } from "next/server";
import { GraderError, gradeInterview } from "@/lib/grader";
import { parseSetup, parseTranscript } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  let body: { setup?: unknown; transcript?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const setup = parseSetup(body.setup);
  if (typeof setup === "string") return fail(setup, 400);
  const transcript = parseTranscript(body.transcript);
  if (typeof transcript === "string") return fail(transcript, 400);

  try {
    return NextResponse.json(await gradeInterview(setup, transcript));
  } catch (error) {
    if (error instanceof GraderError) return fail(error.message, error.status);
    console.error(error);
    return fail("Something went wrong. Please try again.", 500);
  }
}

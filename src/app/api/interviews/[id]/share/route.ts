import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/access";
import { shareInterview, unshareInterview } from "@/lib/interviews";

type Ctx = { params: Promise<{ id: string }> };

/** Creates a public link to the scorecard. */
export async function POST(_req: Request, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const shareId = await shareInterview((await params).id, userId);
  if (!shareId) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  return NextResponse.json({ shareId });
}

/** Turns the public link off. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await unshareInterview((await params).id, userId))) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

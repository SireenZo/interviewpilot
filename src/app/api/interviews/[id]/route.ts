import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/access";
import { deleteInterview } from "@/lib/interviews";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  if (!(await deleteInterview(id, userId))) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import SavedInterview from "@/components/SavedInterview";
import { getInterview } from "@/lib/interviews";

export const metadata = { title: "Scorecard · InterviewPilot" };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/signin?callbackUrl=/interviews/${id}`);
  const row = await getInterview(id, session.user.id);
  if (!row) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6">
      <SavedInterview
        id={row.id}
        roleTitle={row.roleTitle}
        createdAt={row.createdAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
        setup={row.setup}
        transcript={row.transcript}
        scorecard={row.scorecard}
        metrics={row.metrics}
        demo={row.demo}
        shareId={row.shareId}
      />
    </main>
  );
}

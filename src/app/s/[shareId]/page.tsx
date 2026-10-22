import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ScorecardView from "@/components/ScorecardView";
import { getSharedInterview } from "@/lib/interviews";

type Props = { params: Promise<{ shareId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getSharedInterview((await params).shareId);
  if (!row) return { title: "Scorecard not found · InterviewPilot" };
  const who = row.setup.candidateName || "A candidate";
  const title = `${who} scored ${row.overallScore}/100 in an AI mock interview`;
  const description = `${row.roleTitle}. ${row.scorecard.headline}`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

/** Public, read-only scorecard. Never shows the CV or job description. */
export default async function SharedScorecardPage({ params }: Props) {
  const row = await getSharedInterview((await params).shareId);
  if (!row) notFound();
  const who = row.setup.candidateName || "Candidate";

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 pb-24 pt-4 sm:px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-zinc-500">InterviewPilot scorecard</p>
        <h1 className="mt-1 text-3xl font-bold">{who} · {row.roleTitle}</h1>
        <p className="text-zinc-500">{row.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
      </div>
      <ScorecardView
        result={{ scorecard: row.scorecard, metrics: row.metrics, demo: row.demo }}
        transcript={row.transcript}
        language={row.setup.language}
        shared
      />
      <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-8 text-center print:hidden">
        <h2 className="text-2xl font-bold">Practice your own interview</h2>
        <p className="mt-2 text-zinc-300">An AI interviewer that reads your CV, talks with you out loud, and scores you like this.</p>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-semibold shadow-lg shadow-violet-500/25">
          Try InterviewPilot free
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProgressChart from "@/components/ProgressChart";
import RadarChart from "@/components/RadarChart";
import { listInterviews } from "@/lib/interviews";
import { COMPETENCIES } from "@/lib/scorecard";

export const metadata = { title: "Dashboard · InterviewPilot" };

const TYPE_LABEL = { mixed: "Mixed", behavioral: "Behavioral", technical: "Technical" } as const;

function scoreTone(score: number) {
  return score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-rose-300";
}

const shortDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/dashboard");
  const interviews = await listInterviews(session.user.id);
  const firstName = session.user.name?.split(" ")[0];

  if (interviews.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-bold">Welcome{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="mt-3 text-zinc-400">Your interviews, scores and progress will appear here after your first practice session.</p>
        <Link href="/" className="mt-8 inline-block rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-semibold shadow-lg shadow-violet-500/25">
          Start your first interview
        </Link>
      </main>
    );
  }

  const scores = interviews.map((i) => i.overallScore);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best = Math.max(...scores);
  const practiceMin = Math.round(interviews.reduce((a, i) => a + i.durationSec, 0) / 60);
  const chronological = [...interviews].reverse();
  const recent = interviews.slice(0, 5);
  const avgSkills = COMPETENCIES.map((c) => ({
    label: c.label,
    value: Math.round(recent.reduce((a, i) => a + i.scorecard.competencies[c.key].score, 0) / recent.length),
  }));
  const trend = interviews.length > 1 ? interviews[0].overallScore - interviews[interviews.length - 1].overallScore : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your progress{firstName ? `, ${firstName}` : ""}</h1>
          {interviews.length > 1 && (
            <p className={`mt-1 ${trend >= 0 ? "text-emerald-300" : "text-zinc-400"}`}>
              {trend >= 0 ? `▲ ${trend} points since your first interview` : `▼ ${-trend} points since your first interview. Keep practising!`}
            </p>
          )}
        </div>
        <Link href="/" className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-violet-500/25">
          🎙️ New interview
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Interviews" value={String(interviews.length)} />
        <Stat label="Average score" value={String(avg)} />
        <Stat label="Best score" value={String(best)} />
        <Stat label="Practice time" value={`${practiceMin} min`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 text-lg font-semibold">Score trend</h2>
          <ProgressChart points={chronological.map((i) => ({ label: shortDate(i.createdAt), score: i.overallScore }))} />
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-2 text-lg font-semibold">Average skills <span className="text-sm font-normal text-zinc-500">(last {recent.length})</span></h2>
          <div className="flex justify-center">
            <RadarChart axes={avgSkills} size={280} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <h2 className="border-b border-white/10 p-6 text-lg font-semibold">Interview history</h2>
        <ul className="divide-y divide-white/5">
          {interviews.map((i) => (
            <li key={i.id}>
              <Link href={`/interviews/${i.id}`} className="flex items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]">
                <span className={`w-12 text-2xl font-bold tabular-nums ${scoreTone(i.overallScore)}`}>{i.overallScore}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.roleTitle}</span>
                  <span className="block text-sm text-zinc-500">
                    {i.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {TYPE_LABEL[i.setup.interviewType ?? "mixed"]} ·{" "}
                    {i.setup.language === "ar" ? "Arabic" : "English"} · {Math.max(1, Math.round(i.durationSec / 60))} min
                    {i.setup.codingRound ? " · coding" : ""}
                  </span>
                </span>
                {i.demo && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-400">demo</span>}
                <span className="text-zinc-600" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

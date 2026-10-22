"use client";

import { useEffect, useState } from "react";
import { paceLabel } from "@/lib/metrics";
import { COMPETENCIES, questionAnswerPairs, RECOMMENDATION_LABEL, type ScorecardResult } from "@/lib/scorecard";
import type { Lang, Turn } from "@/lib/types";
import RadarChart from "./RadarChart";

function tone(score: number) {
  if (score >= 80) return { text: "text-emerald-300", bar: "bg-emerald-400", ring: "stroke-emerald-400" };
  if (score >= 60) return { text: "text-amber-300", bar: "bg-amber-400", ring: "stroke-amber-400" };
  return { text: "text-rose-300", bar: "bg-rose-400", ring: "stroke-rose-400" };
}

function ScoreRing({ score }: { score: number }) {
  const [shown, setShown] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setShown(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} strokeWidth="10" className="fill-none stroke-white/10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          className={`fill-none ${tone(score).ring}`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold tabular-nums">{shown}</span>
        <span className="text-xs uppercase tracking-widest text-zinc-400">out of 100</span>
      </div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 print:break-inside-avoid print:border-zinc-300 ${className}`}>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md px-2 py-1 text-xs font-medium text-violet-300 hover:bg-violet-500/10 print:hidden"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function formatDuration(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
}

export default function ScorecardView({
  result,
  transcript,
  language,
  actions,
}: {
  result: ScorecardResult;
  transcript: Turn[];
  language: Lang;
  actions?: React.ReactNode;
}) {
  const { scorecard: s, metrics: m } = result;
  const dir = language === "ar" ? "rtl" : "ltr";
  const pairs = questionAnswerPairs(transcript);

  return (
    <div className="animate-fade-in space-y-6">
      {result.demo && (
        <p className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200 print:hidden">
          <strong>Demo scorecard:</strong> sign in to get a real AI evaluation of your answers.
        </p>
      )}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.03] to-fuchsia-500/10 p-6 sm:p-8 print:border-zinc-300">
        <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:text-start">
          <ScoreRing score={s.overallScore} />
          <div dir={dir} className="flex-1 space-y-3">
            <span className={`inline-block rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ${tone(s.overallScore).text}`}>
              {RECOMMENDATION_LABEL[s.recommendation]}
            </span>
            <p className="text-2xl font-semibold leading-snug">{s.headline}</p>
            <p className="text-zinc-300">{s.summary}</p>
          </div>
        </div>
        {actions && <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-end print:hidden">{actions}</div>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card title="Skills breakdown">
          <div className="flex justify-center">
            <RadarChart axes={COMPETENCIES.map((c) => ({ label: c.label, value: s.competencies[c.key].score }))} />
          </div>
        </Card>
        <Card title="What the scores mean">
          <ul dir={dir} className="space-y-4">
            {COMPETENCIES.map((c) => {
              const comp = s.competencies[c.key];
              return (
                <li key={c.key}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{c.label}</span>
                    <span className={`font-semibold tabular-nums ${tone(comp.score).text}`}>{comp.score}</span>
                  </div>
                  <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${tone(comp.score).bar}`} style={{ width: `${comp.score}%` }} />
                  </div>
                  <p className="text-sm text-zinc-400">{comp.comment}</p>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Delivery">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Speaking pace" value={m.avgWpm ? `${m.avgWpm} wpm` : "n/a"} hint={paceLabel(m.avgWpm) ?? "Answer by voice to measure"} />
          <Stat
            label="Filler words"
            value={String(m.totalFillers)}
            hint={m.topFillers.length ? `Most: “${m.topFillers[0].word}” ×${m.topFillers[0].count}` : "Nice and clean"}
          />
          <Stat label="Avg. answer" value={`${m.avgWords} words`} hint={m.avgWords < 60 ? "Try adding more detail" : m.avgWords > 250 ? "Try to be more concise" : "Good length"} />
          <Stat label="Talk time" value={m.talkTimeSec ? formatDuration(m.talkTimeSec) : "n/a"} hint={`${m.answers.length} answers`} />
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="💪 Strengths">
          <ul dir={dir} className="space-y-2 text-zinc-300">
            {s.strengths.map((x) => (
              <li key={x} className="flex gap-2"><span className="text-emerald-400">✓</span>{x}</li>
            ))}
          </ul>
        </Card>
        <Card title="🎯 To improve">
          <ul dir={dir} className="space-y-2 text-zinc-300">
            {s.improvements.map((x) => (
              <li key={x} className="flex gap-2"><span className="text-amber-400">→</span>{x}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Answer by answer">
        <ol className="space-y-4">
          {s.answers.map((a, i) => {
            const pair = pairs[i];
            const am = m.answers[i];
            return (
              <li key={i} className="rounded-xl border border-white/10 p-4 print:break-inside-avoid">
                <details className="group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <div dir={dir} className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Question {i + 1}</p>
                      <p className="mt-1 font-medium">{pair?.question}</p>
                    </div>
                    <span className={`shrink-0 text-xl font-bold tabular-nums ${tone(a.score).text}`}>{a.score}</span>
                  </summary>
                  <div dir={dir} className="mt-4 space-y-4 text-sm">
                    {pair && <p className="rounded-lg bg-white/[0.04] p-3 text-zinc-400">“{pair.answer.text}”</p>}
                    {am && (
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span className="rounded-full bg-white/5 px-2.5 py-1">{am.words} words</span>
                        {am.wpm && <span className="rounded-full bg-white/5 px-2.5 py-1">{am.wpm} wpm</span>}
                        <span className="rounded-full bg-white/5 px-2.5 py-1">{am.fillers} filler words</span>
                      </div>
                    )}
                    <p><span className="font-semibold text-emerald-300">What worked: </span>{a.whatWorked}</p>
                    <p><span className="font-semibold text-amber-300">To improve: </span>{a.toImprove}</p>
                    <div className="rounded-lg border border-violet-400/20 bg-violet-500/10 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">A stronger answer</p>
                        <CopyButton text={a.improvedAnswer} />
                      </div>
                      <p className="leading-relaxed text-zinc-200">{a.improvedAnswer}</p>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="📅 Your practice plan for this week">
        <ol dir={dir} className="space-y-3">
          {s.practicePlan.map((p, i) => (
            <li key={p} className="flex gap-3 text-zinc-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">
                {i + 1}
              </span>
              {p}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

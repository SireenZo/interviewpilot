"use client";

import { useEffect, useState } from "react";
import type { ScorecardResult } from "@/lib/scorecard";
import type { InterviewSetup, Turn } from "@/lib/types";
import Orb from "./Orb";
import ScorecardView from "./ScorecardView";
import Transcript from "./Transcript";

const GRADING_STEPS = [
  "Re-reading your answers…",
  "Checking them against the job requirements…",
  "Measuring delivery and structure…",
  "Writing stronger versions of your answers…",
  "Building your practice plan…",
];

function downloadTranscript(setup: InterviewSetup, transcript: Turn[]) {
  const name = setup.candidateName || "Candidate";
  const lines = transcript.map((t) => `${t.role === "interviewer" ? "Maya (Interviewer)" : name}:\n${t.text}\n`);
  const blob = new Blob([`InterviewPilot transcript\n\n${lines.join("\n")}`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "interview-transcript.txt" });
  a.click();
  URL.revokeObjectURL(url);
}

const secondary = "rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium transition hover:bg-white/5";
const primary =
  "rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-violet-500/25 transition hover:brightness-110";

export default function InterviewResult({
  setup,
  transcript,
  seconds,
  onExit,
}: {
  setup: InterviewSetup;
  transcript: Turn[];
  seconds: number;
  onExit: () => void;
}) {
  const answered = transcript.some((t) => t.role === "candidate");
  const [result, setResult] = useState<ScorecardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const dir = setup.language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!answered) return;
    const controller = new AbortController();
    setError(null);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, GRADING_STEPS.length - 1)), 4000);
    fetch("/api/scorecard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setup, transcript }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult(data);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error && e.message ? e.message : "We couldn't create your scorecard. Please try again.");
      })
      .finally(() => clearInterval(timer));
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [answered, setup, transcript, attempt]);

  const actions = (
    <>
      <button onClick={() => window.print()} className={secondary}>Save as PDF</button>
      <button onClick={() => downloadTranscript(setup, transcript)} className={secondary}>Download transcript</button>
      <button onClick={onExit} className={primary}>New interview</button>
    </>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      {!answered ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Orb state="done" size={112} />
          <h2 className="text-2xl font-bold">Interview ended</h2>
          <p className="text-zinc-400">Answer at least one question to get a scorecard.</p>
          <button onClick={onExit} className={primary}>Start again</button>
        </div>
      ) : result ? (
        <>
          <div className="text-center print:text-start">
            <p className="text-sm uppercase tracking-widest text-zinc-500">Interview scorecard · {Math.floor(seconds / 60)} min</p>
            <h2 className="mt-1 text-3xl font-bold">{setup.candidateName ? `${setup.candidateName}'s results` : "Your results"}</h2>
          </div>
          <ScorecardView result={result} transcript={transcript} language={setup.language} actions={actions} />
          <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 print:hidden">
            <summary className="cursor-pointer text-sm font-medium text-zinc-400">Full transcript</summary>
            <div className="mt-4">
              <Transcript transcript={transcript} setup={setup} dir={dir} />
            </div>
          </details>
        </>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Orb state="done" size={112} />
          <p role="alert" className="max-w-md text-rose-200">{error}</p>
          <div className="flex gap-3">
            <button onClick={() => setAttempt((a) => a + 1)} className={primary}>Try again</button>
            <button onClick={() => downloadTranscript(setup, transcript)} className={secondary}>Download transcript</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 py-16 text-center" aria-live="polite">
          <Orb state="thinking" size={128} />
          <div>
            <h2 className="text-2xl font-bold">Maya is writing your scorecard</h2>
            <p className="mt-2 text-zinc-400">{GRADING_STEPS[step]}</p>
          </div>
        </div>
      )}
    </div>
  );
}

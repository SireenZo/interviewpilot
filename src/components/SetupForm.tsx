"use client";

import { useState } from "react";
import { SAMPLE_CV, SAMPLE_JOB } from "@/lib/demo";
import type { InterviewSetup, InterviewType, Lang, Level } from "@/lib/types";

const LENGTHS = [
  { count: 3, label: "Quick", detail: "~5 min" },
  { count: 5, label: "Standard", detail: "~10 min" },
  { count: 8, label: "Full", detail: "~20 min" },
];

const TYPES: { value: InterviewType; label: string; detail: string }[] = [
  { value: "mixed", label: "Mixed", detail: "Experience, technical and behavioral" },
  { value: "behavioral", label: "Behavioral", detail: "Teamwork, conflict, ownership" },
  { value: "technical", label: "Technical", detail: "Fundamentals, design, deep-dives" },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
];

const choice = (active: boolean) =>
  `rounded-xl border px-3 py-2.5 text-sm transition ${
    active ? "border-violet-400/60 bg-violet-500/15 text-white" : "border-white/10 text-zinc-400 hover:border-white/20"
  }`;

const field =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed outline-none transition placeholder:text-zinc-500 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/15";

export default function SetupForm({ onStart }: { onStart: (setup: InterviewSetup) => void }) {
  const [name, setName] = useState("");
  const [cvText, setCvText] = useState("");
  const [jobText, setJobText] = useState("");
  const [language, setLanguage] = useState<Lang>("en");
  const [questionCount, setQuestionCount] = useState(5);
  const [interviewType, setInterviewType] = useState<InterviewType>("mixed");
  const [level, setLevel] = useState<Level>("junior");
  const [codingRound, setCodingRound] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = cvText.trim() && jobText.trim() && !reading;

  async function uploadPdf(file: File) {
    setReading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("cvFile", file);
      const res = await fetch("/api/cv-text", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCvText(data.cvText);
      if (data.demo) setError("Demo mode: a sample CV was loaded instead of reading your PDF.");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't read that PDF. Please paste your CV instead.");
    } finally {
      setReading(false);
    }
  }

  function fillSample() {
    setName("Lina");
    setCvText(SAMPLE_CV);
    setJobText(SAMPLE_JOB);
    setError(null);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onStart({
            candidateName: name.trim(),
            cvText,
            jobText,
            language,
            questionCount,
            interviewType,
            level,
            codingRound: codingRound && interviewType !== "behavioral",
          });
      }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="cv" className="font-medium">Your CV</label>
            <label className="cursor-pointer text-xs font-medium text-violet-300 hover:text-violet-200">
              {reading ? "Reading PDF…" : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                disabled={reading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPdf(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            id="cv"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste your CV, or upload a PDF…"
            className={`${field} h-64 resize-none`}
          />
        </div>
        <div>
          <label htmlFor="job" className="mb-2 block font-medium">Job description</label>
          <textarea
            id="job"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the job you're interviewing for…"
            className={`${field} h-64 resize-none`}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">Your first name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" className={field} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Language</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["en", "English"],
                ["ar", "العربية"],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  language === code ? "border-violet-400/60 bg-violet-500/15 text-white" : "border-white/10 text-zinc-400 hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Length</p>
          <div className="grid grid-cols-3 gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.count}
                type="button"
                aria-pressed={questionCount === l.count}
                onClick={() => setQuestionCount(l.count)}
                className={`rounded-xl border px-2 py-2 text-center transition ${
                  questionCount === l.count ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 hover:border-white/20"
                }`}
              >
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-[11px] text-zinc-500">{l.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <p className="mb-2 text-sm font-medium">Interview type</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={interviewType === t.value} onClick={() => setInterviewType(t.value)} className={`${choice(interviewType === t.value)} text-center`}>
                <span className="block font-medium">{t.label}</span>
                <span className="hidden text-[11px] text-zinc-500 sm:block">{t.detail}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Seniority</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button key={l.value} type="button" aria-pressed={level === l.value} onClick={() => setLevel(l.value)} className={`${choice(level === l.value)} font-medium`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label
        className={`flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition ${
          interviewType === "behavioral" ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-white/20"
        }`}
      >
        <span>
          <span className="block font-medium">💻 Live coding round</span>
          <span className="block text-sm text-zinc-400">
            {interviewType === "behavioral"
              ? "Not part of behavioral interviews."
              : "Solve a short, job-relevant problem in a code editor, then explain your approach."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={codingRound && interviewType !== "behavioral"}
          disabled={interviewType === "behavioral"}
          onChange={(e) => setCodingRound(e.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-violet-500 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-500/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>

      {error && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</p>}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="submit"
          disabled={!ready}
          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          🎙️ Start my interview
        </button>
        <button
          type="button"
          onClick={fillSample}
          className="w-full rounded-xl px-6 py-3.5 font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 sm:w-auto"
        >
          Try with a sample
        </button>
      </div>
      <p className="text-center text-xs text-zinc-500">
        Best in Chrome or Edge with a microphone. You can also type your answers.
      </p>
    </form>
  );
}

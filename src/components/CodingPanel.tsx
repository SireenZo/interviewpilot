"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { CodingTask } from "@/lib/types";

// Monaco (the VS Code editor) is large and browser-only, so load it on demand.
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading editor…</div>,
});

function formatClock(sec: number) {
  const s = Math.abs(sec);
  return `${sec < 0 ? "-" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CodingPanel({
  task,
  dir,
  onSubmit,
}: {
  task: CodingTask;
  dir: "rtl" | "ltr";
  onSubmit: (code: string, explanation: string) => void;
}) {
  const [code, setCode] = useState(task.starterCode);
  const [explanation, setExplanation] = useState("");
  const [left, setLeft] = useState(task.timeLimitMin * 60);

  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, []);

  const changed = code.trim() !== task.starterCode.trim();

  return (
    <div className="animate-fade-in grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Live coding · {task.language}</p>
            <h3 className="mt-1 text-lg font-semibold">{task.title}</h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
              left < 0 ? "bg-rose-500/20 text-rose-200" : left < 120 ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-zinc-200"
            }`}
            aria-label="Time left"
          >
            {formatClock(left)}
          </span>
        </div>
        <p dir={dir} className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{task.problem}</p>
        {left < 0 && <p className="text-sm text-rose-200">Time&apos;s up. Submit what you have; partial solutions still get feedback.</p>}
        <div>
          <label htmlFor="approach" className="mb-2 block text-sm font-medium">Explain your approach</label>
          <textarea
            id="approach"
            dir={dir}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="How does your solution work? What edge cases did you consider? What's the complexity?"
            className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none placeholder:text-zinc-500 focus:border-violet-400/60"
          />
        </div>
        <button
          onClick={() => onSubmit(code, explanation.trim())}
          disabled={!changed}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit solution
        </button>
      </section>
      <section className="h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] lg:h-auto lg:min-h-[520px]" dir="ltr">
        <Editor
          height="100%"
          language={task.language}
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, padding: { top: 16 }, tabSize: 2 }}
        />
      </section>
    </div>
  );
}

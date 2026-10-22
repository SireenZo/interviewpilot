"use client";

import { useState } from "react";
import InterviewRoom from "@/components/InterviewRoom";
import Orb from "@/components/Orb";
import SetupForm from "@/components/SetupForm";
import type { InterviewSetup } from "@/lib/types";

const FEATURES = [
  { icon: "🎙️", title: "Real voice conversation", text: "Maya speaks her questions and listens to your spoken answers, like a real call." },
  { icon: "🧠", title: "Adapts to your answers", text: "Vague answer? Expect a follow-up. Every question is built from your CV and the job." },
  { icon: "🌍", title: "English or Arabic", text: "Practice in the language you'll actually interview in." },
];

export default function Home() {
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  // Changing the key remounts the room, so "New interview" always starts clean.
  const [session, setSession] = useState(0);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_65%)]" />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <button onClick={() => setSetup(null)} className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm">IP</span>
          InterviewPilot
        </button>
        <a
          href="https://github.com/SireenZo/interviewpilot"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          GitHub ↗
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        {setup ? (
          <InterviewRoom
            key={session}
            setup={setup}
            onExit={() => {
              setSetup(null);
              setSession((s) => s + 1);
            }}
          />
        ) : (
          <>
            <section className="flex flex-col items-center py-10 text-center sm:py-14">
              <Orb state="idle" size={120} />
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
                Practice your next interview{" "}
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">out loud.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-zinc-400">
                Meet Maya, an AI interviewer who reads your CV and the job post, asks real questions by voice, and digs
                deeper when your answers are vague.
              </p>
            </section>

            <section className="mb-12 grid gap-4 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-2xl" aria-hidden>{f.icon}</p>
                  <p className="mt-3 font-semibold">{f.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{f.text}</p>
                </div>
              ))}
            </section>

            <SetupForm onStart={setSetup} />
          </>
        )}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-sm text-zinc-500">
        Built with Next.js, TypeScript and Claude · Your CV and answers are never stored.
      </footer>
    </div>
  );
}

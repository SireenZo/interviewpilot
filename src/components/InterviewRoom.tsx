"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeaker } from "@/hooks/useSpeaker";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { InterviewSetup, Turn } from "@/lib/types";
import Orb, { type OrbState } from "./Orb";

type Phase = "thinking" | "speaking" | "answering" | "error" | "done";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function downloadTranscript(setup: InterviewSetup, transcript: Turn[]) {
  const name = setup.candidateName || "Candidate";
  const lines = transcript.map((t) => `${t.role === "interviewer" ? "Maya (Interviewer)" : name}:\n${t.text}\n`);
  const blob = new Blob([`InterviewPilot transcript\n\n${lines.join("\n")}`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "interview-transcript.txt" });
  a.click();
  URL.revokeObjectURL(url);
}

export default function InterviewRoom({ setup, onExit }: { setup: InterviewSetup; onExit: () => void }) {
  const speechLang = setup.language === "ar" ? "ar-LB" : "en-US";
  const dir = setup.language === "ar" ? "rtl" : "ltr";

  const [voiceOn, setVoiceOn] = useState(true);
  const speaker = useSpeaker(speechLang, voiceOn);
  const recognizer = useSpeechRecognition(speechLang);

  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [live, setLive] = useState("");
  const [phase, setPhase] = useState<Phase>("thinking");
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const endedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<Turn[]>([]);
  const typingRef = useRef(typing);
  typingRef.current = typing;

  const voiceInput = recognizer.supported && !typing;
  const lastQuestion = [...transcript].reverse().find((t) => t.role === "interviewer")?.text ?? "";
  const asked = transcript.filter((t) => t.role === "interviewer").length + (live ? 1 : 0);

  async function interviewerTurn(history: Turn[]) {
    retryRef.current = history;
    setPhase("thinking");
    setLive("");
    setNotice(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // A turn is stale once it was aborted (interview ended, unmounted, or superseded by a newer turn).
    const stale = () => controller.signal.aborted || endedRef.current;
    let res: Response;
    try {
      res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup, transcript: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
    } catch (e) {
      if (stale()) return;
      setNotice(e instanceof Error && e.message ? e.message : "Couldn't reach the interviewer. Check your connection.");
      setPhase("error");
      return;
    }

    const final = res.headers.get("X-Interview-Final") === "1";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const speech = speaker.begin();
    let text = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (stale()) return;
        const chunk = decoder.decode(value, { stream: true });
        if (!text) setPhase("speaking");
        text += chunk;
        setLive(text);
        speech.feed(chunk);
      }
    } catch {
      // Network drop mid-stream: fall through and use whatever arrived.
    }
    if (stale()) return;
    if (!text.trim()) {
      setNotice("The interviewer went quiet. Please try again.");
      setPhase("error");
      return;
    }

    setTranscript([...history, { role: "interviewer", text: text.trim() }]);
    setLive("");
    await speech.end();
    if (stale()) return;

    if (final) {
      setPhase("done");
      return;
    }
    setPhase("answering");
    setDraft("");
    if (recognizer.supported && !typingRef.current) recognizer.start();
  }

  function submitAnswer() {
    const heard = recognizer.listening ? recognizer.stop() : "";
    const answer = (typing ? draft : heard || recognizer.text).trim();
    if (!answer) {
      setNotice(typing ? "Type your answer first." : "I didn't catch that. Try speaking again, or switch to typing.");
      if (!typing) recognizer.start();
      return;
    }
    interviewerTurn([...transcript, { role: "candidate", text: answer }]);
  }

  function toggleTyping() {
    if (!typing) {
      const heard = recognizer.listening ? recognizer.stop() : recognizer.text;
      setDraft((d) => (d ? d : heard));
      setTyping(true);
    } else {
      setTyping(false);
      if (phase === "answering" && recognizer.supported) recognizer.start();
    }
  }

  async function repeatQuestion() {
    if (!lastQuestion || !voiceOn) return;
    const wasListening = recognizer.listening;
    if (wasListening) recognizer.stop();
    speaker.cancel();
    speaker.say(lastQuestion);
    await speaker.whenIdle();
    if (wasListening && !endedRef.current) recognizer.start();
  }

  function endInterview() {
    endedRef.current = true;
    abortRef.current?.abort();
    speaker.cancel();
    if (recognizer.listening) recognizer.stop();
    setLive("");
    setPhase("done");
  }

  // Kick off the greeting. In development React mounts twice; the first request is aborted and ignored.
  useEffect(() => {
    interviewerTurn([]);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // No usable microphone: fall back to typing instead of leaving a dead "listening" panel.
  useEffect(() => {
    if (recognizer.error) setTyping(true);
  }, [recognizer.error]);

  useEffect(() => {
    if (!voiceOn) speaker.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceOn]);

  const orbState: OrbState =
    phase === "done"
      ? "done"
      : phase === "thinking"
        ? "thinking"
        : phase === "speaking" && speaker.speaking
          ? "speaking"
          : phase === "answering" && recognizer.listening
            ? "listening"
            : speaker.speaking
              ? "speaking"
              : "idle";

  if (phase === "done") {
    const answers = transcript.filter((t) => t.role === "candidate").length;
    return (
      <div className="mx-auto max-w-3xl animate-fade-in space-y-8 py-10">
        <div className="flex flex-col items-center text-center">
          <Orb state="done" size={112} />
          <h2 className="mt-4 text-3xl font-bold">Interview complete 🎉</h2>
          <p className="mt-2 text-zinc-400">
            {answers} answers · {formatTime(seconds)} · {setup.language === "ar" ? "Arabic" : "English"}
          </p>
          <p className="mt-4 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            Your AI scorecard is coming in the next update
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => downloadTranscript(setup, transcript)}
            className="rounded-xl border border-white/15 px-6 py-3 font-medium transition hover:bg-white/5"
          >
            Download transcript
          </button>
          <button
            onClick={onExit}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-semibold shadow-lg shadow-violet-500/25 transition hover:brightness-110"
          >
            New interview
          </button>
        </div>
        <Transcript transcript={transcript} setup={setup} dir={dir} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/5 px-3 py-1 font-medium tabular-nums text-zinc-300">⏱ {formatTime(seconds)}</span>
          <span className="text-zinc-400">
            Question {Math.max(1, Math.min(asked, setup.questionCount))} of {setup.questionCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {speaker.supported && (
            <button
              onClick={() => setVoiceOn((v) => !v)}
              aria-pressed={voiceOn}
              className="rounded-lg px-3 py-1.5 text-zinc-300 transition hover:bg-white/5"
            >
              {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
            </button>
          )}
          <button onClick={endInterview} className="rounded-lg px-3 py-1.5 text-rose-300 transition hover:bg-rose-500/10">
            End interview
          </button>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
          style={{ width: `${(Math.min(asked, setup.questionCount) / setup.questionCount) * 100}%` }}
        />
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        <Orb state={orbState} />
        <p dir={dir} className="min-h-[5.5rem] max-w-2xl text-xl leading-relaxed text-zinc-100 sm:text-2xl">
          {live || lastQuestion || <span className="text-zinc-500">Maya is getting ready…</span>}
        </p>
        {phase === "answering" && voiceOn && speaker.supported && (
          <button onClick={repeatQuestion} className="-mt-3 text-sm text-zinc-500 transition hover:text-zinc-300">
            ↻ Repeat question
          </button>
        )}
      </div>

      {notice && (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
          {notice}
        </p>
      )}
      {recognizer.error && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
          {recognizer.error}
        </p>
      )}

      {phase === "error" && (
        <div className="flex justify-center">
          <button
            onClick={() => interviewerTurn(retryRef.current)}
            className="rounded-xl bg-white/10 px-6 py-3 font-medium transition hover:bg-white/15"
          >
            Try again
          </button>
        </div>
      )}

      {phase === "answering" && (
        <div className="animate-fade-in rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {voiceInput ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <span className={`h-2.5 w-2.5 rounded-full bg-emerald-400 ${recognizer.listening ? "animate-pulse" : "opacity-40"}`} />
                {recognizer.listening ? "Listening… take your time" : "Microphone paused"}
              </div>
              <p dir={dir} className="min-h-[3rem] whitespace-pre-wrap text-zinc-200">
                {recognizer.text || <span className="text-zinc-500">Start speaking your answer…</span>}
              </p>
            </div>
          ) : (
            <textarea
              dir={dir}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitAnswer();
              }}
              placeholder="Type your answer… (Ctrl/⌘ + Enter to send)"
              className="h-32 w-full resize-none bg-transparent text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          )}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {recognizer.supported ? (
              <button onClick={toggleTyping} className="text-sm text-zinc-400 transition hover:text-zinc-200">
                {typing ? "🎙️ Answer by voice" : "⌨️ Type instead"}
              </button>
            ) : (
              <span className="text-xs text-zinc-500">Voice answers need Chrome or Edge.</span>
            )}
            <button
              onClick={submitAnswer}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
            >
              {typing ? "Send answer" : "I'm done answering"}
            </button>
          </div>
        </div>
      )}

      {transcript.length > 1 && (
        <details className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <summary className="cursor-pointer text-sm font-medium text-zinc-400">Conversation so far</summary>
          <div className="mt-4">
            <Transcript transcript={transcript} setup={setup} dir={dir} />
          </div>
        </details>
      )}
    </div>
  );
}

function Transcript({ transcript, setup, dir }: { transcript: Turn[]; setup: InterviewSetup; dir: "rtl" | "ltr" }) {
  return (
    <ol className="space-y-4">
      {transcript.map((t, i) => (
        <li key={i} className={`flex ${t.role === "candidate" ? "justify-end" : "justify-start"}`}>
          <div
            dir={dir}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              t.role === "candidate" ? "bg-emerald-500/15 text-emerald-50" : "bg-violet-500/15 text-violet-50"
            }`}
          >
            <p className="mb-1 text-xs font-semibold opacity-60">
              {t.role === "interviewer" ? "Maya" : setup.candidateName || "You"}
            </p>
            {t.text}
          </div>
        </li>
      ))}
    </ol>
  );
}

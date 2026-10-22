"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DeliveryMetrics } from "@/lib/metrics";
import type { Scorecard } from "@/lib/scorecard";
import type { InterviewSetup, Turn } from "@/lib/types";
import ScorecardView from "./ScorecardView";
import Transcript from "./Transcript";

type Props = {
  id: string;
  roleTitle: string;
  createdAt: string;
  setup: InterviewSetup;
  transcript: Turn[];
  scorecard: Scorecard;
  metrics: DeliveryMetrics;
  demo: boolean;
  shareId: string | null;
};

const secondary = "rounded-xl border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/5 disabled:opacity-50";

export default function SavedInterview(props: Props) {
  const router = useRouter();
  const [shareId, setShareId] = useState(props.shareId);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // window isn't available during server rendering, so the origin is filled in after mount.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const shareUrl = shareId && origin ? `${origin}/s/${shareId}` : null;

  async function call(url: string, method: "POST" | "DELETE") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const data = await call(`/api/interviews/${props.id}/share`, "POST");
    if (!data) return;
    setShareId(data.shareId);
    await navigator.clipboard.writeText(`${window.location.origin}/s/${data.shareId}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function unshare() {
    if (await call(`/api/interviews/${props.id}/share`, "DELETE")) setShareId(null);
  }

  async function remove() {
    if (!window.confirm("Delete this interview and its scorecard? This can't be undone.")) return;
    if (await call(`/api/interviews/${props.id}`, "DELETE")) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const actions = (
    <>
      <button onClick={share} disabled={busy} className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-50">
        {copied ? "Link copied ✓" : shareId ? "Copy share link" : "🔗 Share scorecard"}
      </button>
      <button onClick={() => window.print()} className={secondary}>Save as PDF</button>
      <button onClick={remove} disabled={busy} className={`${secondary} text-rose-300`}>Delete</button>
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <a href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300 print:hidden">← Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold">{props.roleTitle}</h1>
        <p className="text-zinc-500">{props.createdAt}</p>
      </div>
      {shareUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 print:hidden">
          <span>Public link (shows your scorecard and answers, never your CV):</span>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="font-medium underline">{shareUrl}</a>
          <button onClick={unshare} disabled={busy} className="ms-auto text-emerald-300 underline hover:text-emerald-100">Stop sharing</button>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      <ScorecardView
        result={{ scorecard: props.scorecard, metrics: props.metrics, demo: props.demo }}
        transcript={props.transcript}
        language={props.setup.language}
        actions={actions}
      />
      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 print:hidden">
        <summary className="cursor-pointer text-sm font-medium text-zinc-400">Full transcript</summary>
        <div className="mt-4">
          <Transcript transcript={props.transcript} setup={props.setup} dir={props.setup.language === "ar" ? "rtl" : "ltr"} />
        </div>
      </details>
    </div>
  );
}

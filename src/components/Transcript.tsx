import type { InterviewSetup, Turn } from "@/lib/types";

export default function Transcript({ transcript, setup, dir }: { transcript: Turn[]; setup: InterviewSetup; dir: "rtl" | "ltr" }) {
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

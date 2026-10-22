export type OrbState = "idle" | "thinking" | "speaking" | "listening" | "done";

const LABEL: Record<OrbState, string> = {
  idle: "Ready",
  thinking: "Thinking…",
  speaking: "Speaking",
  listening: "Listening to you",
  done: "Interview complete",
};

/** Maya's animated presence: breathes when idle, pulses when talking, ripples when listening. */
export default function Orb({ state, size = 176 }: { state: OrbState; size?: number }) {
  const listening = state === "listening";
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {listening && (
          <>
            <span className="absolute inset-0 animate-ripple rounded-full bg-emerald-400/30" />
            <span className="absolute inset-0 animate-ripple rounded-full bg-emerald-400/20 [animation-delay:1s]" />
          </>
        )}
        <div
          className={`absolute -inset-3 rounded-full blur-2xl transition-colors duration-700 ${
            listening ? "bg-emerald-500/30" : state === "done" ? "bg-zinc-500/20" : "bg-violet-500/40"
          }`}
        />
        <div
          className={`relative h-full w-full overflow-hidden rounded-full shadow-2xl transition-all duration-700 ${
            state === "speaking" ? "animate-talk" : state === "thinking" ? "" : "animate-breathe"
          } ${
            listening
              ? "bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-700"
              : state === "done"
                ? "bg-gradient-to-br from-zinc-400 via-zinc-600 to-zinc-800"
                : "bg-gradient-to-br from-fuchsia-400 via-violet-600 to-indigo-800"
          }`}
        >
          <div
            className={`absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.35),transparent_40%)] ${
              state === "thinking" ? "animate-spin" : "animate-spin-slow"
            }`}
          />
          <div className="absolute inset-[18%] rounded-full bg-white/10 backdrop-blur-sm" />
        </div>
      </div>
      <p className="text-sm font-medium tracking-wide text-zinc-400" aria-live="polite">
        {LABEL[state]}
      </p>
    </div>
  );
}

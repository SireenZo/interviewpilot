import { CODE_LANGUAGES, LIMITS, type CodingTask, type InterviewSetup, type Turn } from "./types";

const TYPES = ["mixed", "behavioral", "technical"] as const;
const LEVELS = ["junior", "mid", "senior"] as const;

/** Validates and normalises an interview setup coming from the browser. Returns an error message on failure. */
export function parseSetup(raw: unknown): InterviewSetup | string {
  const s = raw as Partial<InterviewSetup> | null;
  if (!s || typeof s !== "object") return "Invalid request.";
  if (typeof s.jobText !== "string" || !s.jobText.trim()) return "Please add a job description.";
  if (typeof s.cvText !== "string" || !s.cvText.trim()) return "Please add your CV.";
  if (s.jobText.length > LIMITS.text || s.cvText.length > LIMITS.text) return "CV or job description is too long.";
  if (s.language !== "en" && s.language !== "ar") return "Unsupported language.";
  if (typeof s.questionCount !== "number" || s.questionCount < 2 || s.questionCount > 10) return "Invalid interview length.";
  const interviewType = TYPES.includes(s.interviewType as never) ? s.interviewType! : "mixed";
  return {
    candidateName: String(s.candidateName ?? "").slice(0, 80),
    cvText: s.cvText,
    jobText: s.jobText,
    language: s.language,
    questionCount: s.questionCount,
    interviewType,
    level: LEVELS.includes(s.level as never) ? s.level! : "mid",
    // Behavioral interviews never include a coding exercise.
    codingRound: s.codingRound === true && interviewType !== "behavioral",
  };
}

function parseCodingTask(raw: unknown): CodingTask | null {
  const c = raw as Partial<CodingTask> | null;
  if (!c || typeof c !== "object") return null;
  if (typeof c.title !== "string" || typeof c.problem !== "string" || typeof c.starterCode !== "string") return null;
  if (!CODE_LANGUAGES.includes(c.language as never)) return null;
  if (c.title.length > 200 || c.problem.length > LIMITS.answer || c.starterCode.length > LIMITS.code) return null;
  const timeLimitMin = typeof c.timeLimitMin === "number" ? Math.min(30, Math.max(5, Math.round(c.timeLimitMin))) : 15;
  return { title: c.title, problem: c.problem, language: c.language!, starterCode: c.starterCode, timeLimitMin };
}

/**
 * Validates a transcript: strictly alternating turns starting with the interviewer.
 * Only known fields are kept, so nothing unexpected from the client reaches the model or the database.
 */
export function parseTranscript(raw: unknown): Turn[] | string {
  if (!Array.isArray(raw)) return "Invalid transcript.";
  if (raw.length > LIMITS.turns) return "This interview is too long.";
  const turns: Turn[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i] as Partial<Turn> | null;
    const expected = i % 2 === 0 ? "interviewer" : "candidate";
    if (t?.role !== expected || typeof t.text !== "string" || t.text.length > LIMITS.answer) return "Invalid transcript.";
    const turn: Turn = { role: t.role, text: t.text };
    if (t.role === "interviewer" && t.coding) {
      const coding = parseCodingTask(t.coding);
      if (!coding) return "Invalid transcript.";
      turn.coding = coding;
    }
    if (t.role === "candidate") {
      if (t.mode === "voice" || t.mode === "text") turn.mode = t.mode;
      if (typeof t.durationSec === "number" && t.durationSec > 0 && t.durationSec < 3600) turn.durationSec = Math.round(t.durationSec);
      if (typeof t.code === "string") {
        if (t.code.length > LIMITS.code) return "Your code is too long.";
        turn.code = t.code;
      }
    }
    turns.push(turn);
  }
  return turns;
}

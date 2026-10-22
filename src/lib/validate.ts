import { LIMITS, type InterviewSetup, type Turn } from "./types";

/** Validates and normalises an interview setup coming from the browser. Returns an error message on failure. */
export function parseSetup(raw: unknown): InterviewSetup | string {
  const s = raw as Partial<InterviewSetup> | null;
  if (!s || typeof s !== "object") return "Invalid request.";
  if (typeof s.jobText !== "string" || !s.jobText.trim()) return "Please add a job description.";
  if (typeof s.cvText !== "string" || !s.cvText.trim()) return "Please add your CV.";
  if (s.jobText.length > LIMITS.text || s.cvText.length > LIMITS.text) return "CV or job description is too long.";
  if (s.language !== "en" && s.language !== "ar") return "Unsupported language.";
  if (typeof s.questionCount !== "number" || s.questionCount < 2 || s.questionCount > 10) return "Invalid interview length.";
  return {
    candidateName: String(s.candidateName ?? "").slice(0, 80),
    cvText: s.cvText,
    jobText: s.jobText,
    language: s.language,
    questionCount: s.questionCount,
  };
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
    if (t.role === "candidate") {
      if (t.mode === "voice" || t.mode === "text") turn.mode = t.mode;
      if (typeof t.durationSec === "number" && t.durationSec > 0 && t.durationSec < 3600) turn.durationSec = Math.round(t.durationSec);
    }
    turns.push(turn);
  }
  return turns;
}

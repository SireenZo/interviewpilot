export type Lang = "en" | "ar";

export type Turn = {
  role: "interviewer" | "candidate";
  text: string;
  /** Candidate turns only: how the answer was given, and how long it was spoken for. */
  mode?: "voice" | "text";
  durationSec?: number;
};

export type InterviewSetup = {
  candidateName: string;
  cvText: string;
  jobText: string;
  language: Lang;
  /** Number of main questions before the interviewer wraps up. */
  questionCount: number;
};

export type InterviewRequest = {
  setup: InterviewSetup;
  transcript: Turn[];
};

export const LIMITS = {
  text: 30_000,
  answer: 6_000,
  turns: 60,
  pdfBytes: 4 * 1024 * 1024,
} as const;

/** How many interviewer turns have happened, and whether the next one should close the interview. */
export function interviewProgress(transcript: Turn[], questionCount: number) {
  const asked = transcript.filter((t) => t.role === "interviewer").length;
  // The first interviewer turn is the greeting + first question, so the closing turn comes after `questionCount` turns.
  return { asked, isClosingTurn: asked >= questionCount };
}

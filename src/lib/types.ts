export type Lang = "en" | "ar";
export type InterviewType = "mixed" | "behavioral" | "technical";
export type Level = "junior" | "mid" | "senior";
export type CodeLanguage = "javascript" | "typescript" | "python" | "java" | "sql";

export type CodingTask = {
  title: string;
  problem: string;
  language: CodeLanguage;
  starterCode: string;
  timeLimitMin: number;
};

export type Turn = {
  role: "interviewer" | "candidate";
  text: string;
  /** Interviewer turns only: present when this turn sets the live coding exercise. */
  coding?: CodingTask;
  /** Candidate turns only: how the answer was given, and how long it was spoken for. */
  mode?: "voice" | "text";
  durationSec?: number;
  /** Candidate turns only: the solution submitted in the coding round. */
  code?: string;
};

export type InterviewSetup = {
  candidateName: string;
  cvText: string;
  jobText: string;
  language: Lang;
  /** Number of conversational questions before the coding round (if any) and the closing. */
  questionCount: number;
  interviewType: InterviewType;
  level: Level;
  codingRound: boolean;
};

export type InterviewRequest = {
  setup: InterviewSetup;
  transcript: Turn[];
};

export type NextTurnKind = "question" | "coding" | "closing";

export const LIMITS = {
  text: 30_000,
  answer: 6_000,
  code: 20_000,
  turns: 60,
  pdfBytes: 4 * 1024 * 1024,
} as const;

export const CODE_LANGUAGES: CodeLanguage[] = ["javascript", "typescript", "python", "java", "sql"];

/** Decides what the interviewer does next: ask a question, set the coding exercise, or close. */
export function nextTurnKind(transcript: Turn[], setup: Pick<InterviewSetup, "questionCount" | "codingRound">): NextTurnKind {
  const asked = transcript.filter((t) => t.role === "interviewer").length;
  const hadCoding = transcript.some((t) => t.coding);
  if (asked < setup.questionCount) return "question";
  if (setup.codingRound && !hadCoding) return "coding";
  return "closing";
}

/** Total interviewer turns that ask something (questions plus the coding task), for progress display. */
export function plannedSteps(setup: Pick<InterviewSetup, "questionCount" | "codingRound">) {
  return setup.questionCount + (setup.codingRound ? 1 : 0);
}

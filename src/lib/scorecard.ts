import { z } from "zod";
import type { DeliveryMetrics } from "./metrics";
import type { Turn } from "./types";

const Score = z.number().describe("0-100");

export const COMPETENCIES = [
  { key: "communication", label: "Communication" },
  { key: "technicalDepth", label: "Technical depth" },
  { key: "problemSolving", label: "Problem solving" },
  { key: "roleFit", label: "Role fit" },
  { key: "structure", label: "Answer structure" },
] as const;

export type CompetencyKey = (typeof COMPETENCIES)[number]["key"];

const Competency = z.object({
  score: Score,
  comment: z.string().describe("One sentence of evidence-based reasoning, citing what the candidate said."),
});

export const ScorecardSchema = z.object({
  overallScore: Score.describe("0-100 overall interview performance. 85+ exceptional, 70-84 strong, 55-69 mixed, below 55 weak."),
  recommendation: z.enum(["strong_hire", "hire", "lean_hire", "no_hire"]),
  headline: z.string().describe("One punchy sentence summarising the performance, written to the candidate."),
  summary: z.string().describe("2-3 sentences, written to the candidate in second person."),
  competencies: z.object({
    communication: Competency,
    technicalDepth: Competency,
    problemSolving: Competency,
    roleFit: Competency,
    structure: Competency.describe("Use of structure such as STAR: situation, task, action, result."),
  }),
  answers: z
    .array(
      z.object({
        answerIndex: z.number().describe("0-based index of the candidate answer this feedback is about."),
        score: Score,
        whatWorked: z.string().describe("One sentence."),
        toImprove: z.string().describe("One concrete, actionable sentence."),
        improvedAnswer: z
          .string()
          .describe("A stronger version of this answer in the candidate's own voice, 3-6 sentences, using only facts from their CV and answer. Never invent employers, numbers or projects; use placeholders like [number] where a metric would help."),
      }),
    )
    .describe("Exactly one entry per candidate answer, in order."),
  strengths: z.array(z.string()).describe("Top 3 strengths, each one short sentence."),
  improvements: z.array(z.string()).describe("Top 3 things to improve, each one short, actionable sentence."),
  practicePlan: z.array(z.string()).describe("3 specific practice exercises for the next week."),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;

export type ScorecardResult = { scorecard: Scorecard; metrics: DeliveryMetrics; demo: boolean };

export const RECOMMENDATION_LABEL: Record<Scorecard["recommendation"], string> = {
  strong_hire: "Strong hire",
  hire: "Hire",
  lean_hire: "Lean hire",
  no_hire: "Not yet",
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Clamps scores and aligns per-answer feedback with the real answers, whatever order the model used. */
export function normalizeScorecard(s: Scorecard, answerCount: number): Scorecard {
  const byIndex = new Map(s.answers.map((a) => [a.answerIndex, a]));
  const answers = Array.from({ length: answerCount }, (_, i) => byIndex.get(i) ?? s.answers[i]).filter(
    (a): a is Scorecard["answers"][number] => Boolean(a),
  );
  const competencies = Object.fromEntries(
    Object.entries(s.competencies).map(([k, c]) => [k, { ...c, score: clamp(c.score) }]),
  ) as Scorecard["competencies"];
  return {
    ...s,
    overallScore: clamp(s.overallScore),
    competencies,
    answers: answers.map((a, i) => ({ ...a, answerIndex: i, score: clamp(a.score) })),
    strengths: s.strengths.slice(0, 3),
    improvements: s.improvements.slice(0, 3),
    practicePlan: s.practicePlan.slice(0, 3),
  };
}

/** Pairs each candidate answer with the interviewer question that came right before it. */
export function questionAnswerPairs(transcript: Turn[]) {
  const pairs: { question: string; answer: Turn }[] = [];
  transcript.forEach((t, i) => {
    if (t.role === "candidate") pairs.push({ question: transcript[i - 1]?.text ?? "", answer: t });
  });
  return pairs;
}

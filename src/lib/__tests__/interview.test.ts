import { describe, expect, it } from "vitest";
import { buildMessages } from "../prompts";
import { normalizeScorecard, questionAnswerPairs, type Scorecard } from "../scorecard";
import { nextTurnKind, plannedSteps, type InterviewSetup, type Turn } from "../types";
import { parseSetup, parseTranscript } from "../validate";

const setup: InterviewSetup = {
  candidateName: "Lina",
  cvText: "CV",
  jobText: "Frontend Engineer",
  language: "en",
  questionCount: 2,
  interviewType: "technical",
  level: "junior",
  codingRound: true,
};

const q = (text: string): Turn => ({ role: "interviewer", text });
const a = (text: string): Turn => ({ role: "candidate", text });

describe("nextTurnKind", () => {
  it("asks questions, then the coding task, then closes", () => {
    expect(nextTurnKind([], setup)).toBe("question");
    expect(nextTurnKind([q("1"), a("x")], setup)).toBe("question");
    expect(nextTurnKind([q("1"), a("x"), q("2"), a("y")], setup)).toBe("coding");
    const coding: Turn = { ...q("code"), coding: { title: "t", problem: "p", language: "python", starterCode: "", timeLimitMin: 10 } };
    expect(nextTurnKind([q("1"), a("x"), q("2"), a("y"), coding, a("done")], setup)).toBe("closing");
  });

  it("closes straight after the questions without a coding round", () => {
    expect(nextTurnKind([q("1"), a("x"), q("2"), a("y")], { ...setup, codingRound: false })).toBe("closing");
    expect(plannedSteps({ ...setup, codingRound: false })).toBe(2);
    expect(plannedSteps(setup)).toBe(3);
  });
});

describe("buildMessages", () => {
  it("is append-only, so earlier messages never change and the prompt cache keeps hitting", () => {
    const short = buildMessages(setup, [q("1"), a("x")]);
    const long = buildMessages(setup, [q("1"), a("x"), q("2"), a("y")]);
    expect(long.slice(0, short.length)).toEqual(short);
  });

  it("alternates roles starting with the user", () => {
    const roles = buildMessages(setup, [q("1"), a("x"), q("2"), a("y")]).map((m) => m.role);
    expect(roles).toEqual(["user", "assistant", "user", "assistant", "user"]);
  });

  it("tells the model to close after the final answer", () => {
    const msgs = buildMessages({ ...setup, codingRound: false }, [q("1"), a("x"), q("2"), a("y")]);
    expect(String(msgs.at(-1)?.content)).toContain("Do NOT ask another question");
  });
});

describe("parseSetup", () => {
  it("rejects missing fields and normalises optional ones", () => {
    expect(parseSetup({ ...setup, jobText: " " })).toBe("Please add a job description.");
    expect(parseSetup({ ...setup, questionCount: 50 })).toBe("Invalid interview length.");
    const parsed = parseSetup({ ...setup, interviewType: "nonsense", level: undefined });
    expect(parsed).toMatchObject({ interviewType: "mixed", level: "mid" });
  });

  it("never enables coding for behavioral interviews", () => {
    expect(parseSetup({ ...setup, interviewType: "behavioral", codingRound: true })).toMatchObject({ codingRound: false });
  });
});

describe("parseTranscript", () => {
  it("requires alternating turns starting with the interviewer", () => {
    expect(parseTranscript([a("x")])).toBe("Invalid transcript.");
    expect(parseTranscript([q("1"), q("2")])).toBe("Invalid transcript.");
  });

  it("strips unknown fields", () => {
    const parsed = parseTranscript([q("1"), { ...a("x"), mode: "voice", durationSec: 12.4, evil: "x" }]);
    expect(parsed).toEqual([q("1"), { role: "candidate", text: "x", mode: "voice", durationSec: 12 }]);
  });
});

describe("scorecard helpers", () => {
  const base: Scorecard = {
    overallScore: 140,
    recommendation: "hire",
    headline: "h",
    summary: "s",
    competencies: {
      communication: { score: 70, comment: "" },
      technicalDepth: { score: -5, comment: "" },
      problemSolving: { score: 70, comment: "" },
      roleFit: { score: 70, comment: "" },
      structure: { score: 70, comment: "" },
    },
    answers: [
      { answerIndex: 1, score: 60, whatWorked: "second", toImprove: "", improvedAnswer: "" },
      { answerIndex: 0, score: 80, whatWorked: "first", toImprove: "", improvedAnswer: "" },
    ],
    strengths: ["a", "b", "c", "d"],
    improvements: [],
    practicePlan: [],
    coding: null,
  };

  it("clamps scores and puts answer feedback in transcript order", () => {
    const n = normalizeScorecard(base, 2);
    expect(n.overallScore).toBe(100);
    expect(n.competencies.technicalDepth.score).toBe(0);
    expect(n.answers.map((x) => x.whatWorked)).toEqual(["first", "second"]);
    expect(n.strengths).toHaveLength(3);
  });

  it("pairs answers with the question before them", () => {
    expect(questionAnswerPairs([q("Q1"), a("A1"), q("Q2"), a("A2")]).map((p) => [p.question, p.answer.text])).toEqual([
      ["Q1", "A1"],
      ["Q2", "A2"],
    ]);
  });
});

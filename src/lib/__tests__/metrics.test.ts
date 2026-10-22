import { describe, expect, it } from "vitest";
import { countFillers, countWords, deliveryMetrics, paceLabel } from "../metrics";
import type { Turn } from "../types";

describe("countFillers", () => {
  it("counts English fillers as whole words only", () => {
    expect(countFillers("Um, I basically built it, like, myself.", "en")).toEqual({ um: 1, basically: 1, like: 1 });
    // "likely" and "umbrella" contain fillers but are real words.
    expect(countFillers("It is likely an umbrella.", "en")).toEqual({});
  });

  it("counts multi-word fillers once", () => {
    expect(countFillers("You know, it was, you know, hard.", "en")).toEqual({ "you know": 2 });
  });

  it("counts Arabic fillers", () => {
    expect(countFillers("يعني بنيت النظام، يعني بنفسي", "ar")).toEqual({ يعني: 2 });
  });
});

describe("deliveryMetrics", () => {
  const transcript: Turn[] = [
    { role: "interviewer", text: "Tell me about a project." },
    { role: "candidate", text: "um I built a booking system for a clinic in Beirut", mode: "voice", durationSec: 6 },
    { role: "interviewer", text: "How did you test it?" },
    { role: "candidate", text: "I wrote unit tests with Jest", mode: "text" },
  ];

  it("summarises answers, fillers and pace", () => {
    const m = deliveryMetrics(transcript, "en");
    expect(m.answers).toHaveLength(2);
    expect(m.totalWords).toBe(17);
    expect(m.totalFillers).toBe(1);
    expect(m.avgWords).toBe(9);
    // Only the spoken answer is timed: 11 words in 6 seconds = 110 wpm.
    expect(m.avgWpm).toBe(110);
    expect(m.answers[1].wpm).toBeNull();
    expect(m.topFillers).toEqual([{ word: "um", count: 1 }]);
  });

  it("handles interviews with no answers", () => {
    expect(deliveryMetrics([{ role: "interviewer", text: "Hi" }], "en")).toMatchObject({ totalWords: 0, fillerRate: 0, avgWpm: null });
  });
});

describe("helpers", () => {
  it("counts words", () => expect(countWords("  one two\nthree ")).toBe(3));
  it("labels pace", () => {
    expect(paceLabel(null)).toBeNull();
    expect(paceLabel(90)).toBe("A bit slow");
    expect(paceLabel(140)).toBe("Good pace");
    expect(paceLabel(200)).toBe("A bit fast");
  });
});

import type { Lang, Turn } from "./types";

// Multi-word fillers come first so "you know" is counted once rather than leaving a stray "know".
const FILLERS: Record<Lang, string[]> = {
  en: ["you know", "i mean", "kind of", "sort of", "um", "umm", "uh", "uhh", "er", "erm", "like", "basically", "actually", "literally"],
  ar: ["يعني", "مثلا", "مثلاً", "طيب", "اممم", "امم", "آه", "اه", "يا عمي", "بصراحة"],
};

export type AnswerMetrics = {
  words: number;
  fillers: number;
  fillerWords: Record<string, number>;
  /** Words per minute; only for spoken answers with a measured duration. */
  wpm: number | null;
  durationSec: number | null;
};

export type DeliveryMetrics = {
  answers: AnswerMetrics[];
  totalWords: number;
  totalFillers: number;
  /** Fillers per 100 words, the usual way coaches compare filler use. */
  fillerRate: number;
  avgWords: number;
  avgWpm: number | null;
  talkTimeSec: number | null;
  topFillers: { word: string; count: number }[];
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countFillers(text: string, lang: Lang) {
  let remaining = ` ${text.toLowerCase()} `;
  const found: Record<string, number> = {};
  for (const filler of FILLERS[lang]) {
    // Word boundaries that also work for Arabic script (\b only understands ASCII word characters).
    const re = new RegExp(`(?<=[\\s.,!?؟،;:"'()])${escapeRegExp(filler)}(?=[\\s.,!?؟،;:"'()])`, "g");
    const matches = remaining.match(re);
    if (matches?.length) {
      found[filler] = matches.length;
      remaining = remaining.replace(re, " ");
    }
  }
  return found;
}

export function answerMetrics(turn: Turn, lang: Lang): AnswerMetrics {
  const words = countWords(turn.text);
  const fillerWords = countFillers(turn.text, lang);
  const fillers = Object.values(fillerWords).reduce((a, b) => a + b, 0);
  const durationSec = turn.mode === "voice" && turn.durationSec && turn.durationSec > 2 ? turn.durationSec : null;
  const wpm = durationSec ? Math.round((words / durationSec) * 60) : null;
  return { words, fillers, fillerWords, wpm, durationSec };
}

export function deliveryMetrics(transcript: Turn[], lang: Lang): DeliveryMetrics {
  const answers = transcript.filter((t) => t.role === "candidate").map((t) => answerMetrics(t, lang));
  const totalWords = answers.reduce((a, m) => a + m.words, 0);
  const totalFillers = answers.reduce((a, m) => a + m.fillers, 0);
  const timed = answers.filter((m) => m.wpm !== null && m.durationSec !== null);
  const talkTime = timed.reduce((a, m) => a + (m.durationSec ?? 0), 0);
  const timedWords = timed.reduce((a, m) => a + m.words, 0);

  const merged: Record<string, number> = {};
  for (const m of answers) for (const [w, c] of Object.entries(m.fillerWords)) merged[w] = (merged[w] ?? 0) + c;

  return {
    answers,
    totalWords,
    totalFillers,
    fillerRate: totalWords ? Math.round((totalFillers / totalWords) * 1000) / 10 : 0,
    avgWords: answers.length ? Math.round(totalWords / answers.length) : 0,
    avgWpm: talkTime > 0 ? Math.round((timedWords / talkTime) * 60) : null,
    talkTimeSec: timed.length ? Math.round(talkTime) : null,
    topFillers: Object.entries(merged)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
  };
}

/** Plain-language read of speaking pace; conversational interview pace is roughly 120-160 wpm. */
export function paceLabel(wpm: number | null) {
  if (wpm === null) return null;
  if (wpm < 110) return "A bit slow";
  if (wpm > 170) return "A bit fast";
  return "Good pace";
}

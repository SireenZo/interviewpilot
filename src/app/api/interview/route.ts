import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { aiAccess } from "@/lib/access";
import { createCodingTurn } from "@/lib/coding";
import { demoTurn } from "@/lib/demo";
import { buildMessages, INTERVIEWER_SYSTEM } from "@/lib/prompts";
import { nextTurnKind, type NextTurnKind } from "@/lib/types";
import { parseSetup, parseTranscript } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const FALLBACK_LINE = {
  en: "Sorry, I lost my train of thought for a second. Could you tell me a bit more about that?",
  ar: "عذراً، فقدت تركيزي للحظة. هل يمكنك أن تخبرني المزيد عن ذلك؟",
} as const;

// Demo mode has five scripted questions, so it never plans more than that.
const DEMO_MAX_QUESTIONS = 5;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function apiFailure(error: unknown) {
  if (error instanceof Anthropic.RateLimitError) return fail("The interviewer is busy. Please wait a moment and try again.", 429);
  if (error instanceof Anthropic.AuthenticationError) return fail("Server API key is invalid.", 500);
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error", error.status, error.message);
    return fail("The interviewer had a problem. Please try again.", 502);
  }
  console.error(error);
  return fail("Something went wrong. Please try again.", 500);
}

/**
 * Streams the interviewer's spoken turn as plain text. The X-Turn-Kind header tells the client
 * whether this turn closes the interview, so it knows whether to listen afterwards.
 */
function textStream(kind: NextTurnKind, mode: "ai" | "demo", produce: (write: (text: string) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await produce((text) => controller.enqueue(encoder.encode(text)));
      } catch (error) {
        console.error("Interview stream failed", error);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Turn-Kind": kind, "X-Mode": mode },
  });
}

export async function POST(req: Request) {
  let body: { setup?: unknown; transcript?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const setup = parseSetup(body.setup);
  if (typeof setup === "string") return fail(setup, 400);
  const transcript = parseTranscript(body.transcript);
  if (typeof transcript === "string") return fail(transcript, 400);
  // The client asks for the next interviewer turn only after the candidate has answered (or at the very start).
  if (transcript.length % 2 !== 0) return fail("Waiting for the candidate's answer.", 400);

  // Starting an interview counts against the daily interview limit; later turns against a generous turn limit.
  const access = await aiAccess(transcript.length === 0 ? "interview" : "turn");
  if (access.mode === "limited") return fail(access.message, 429);
  const demo = access.mode === "demo";
  const mode = demo ? "demo" : "ai";
  const kind = nextTurnKind(transcript, demo ? { ...setup, questionCount: Math.min(setup.questionCount, DEMO_MAX_QUESTIONS) } : setup);

  // The coding exercise is structured (problem, starter code), so it is returned as JSON rather than streamed.
  if (kind === "coding") {
    try {
      const turn = await createCodingTurn(setup, transcript, !demo);
      return NextResponse.json({ turn }, { headers: { "X-Turn-Kind": "coding", "X-Mode": mode } });
    } catch (error) {
      return apiFailure(error);
    }
  }

  // Demo mode: a scripted interviewer, streamed word by word, so anyone can try the voice loop without an API key.
  if (demo) {
    const asked = transcript.filter((t) => t.role === "interviewer").length;
    const line = demoTurn(setup, asked, kind === "closing");
    return textStream(kind, mode, async (write) => {
      await new Promise((r) => setTimeout(r, 600));
      for (const word of line.split(/(\s+)/)) {
        write(word);
        await new Promise((r) => setTimeout(r, 25));
      }
    });
  }

  const client = new Anthropic();
  let stream;
  try {
    stream = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Low effort keeps the voice conversation snappy; interviewer turns are short.
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: INTERVIEWER_SYSTEM,
      messages: buildMessages(setup, transcript),
    });
    // Surface auth / rate-limit errors as proper HTTP errors before the response starts streaming.
    await stream.withResponse();
  } catch (error) {
    return apiFailure(error);
  }

  return textStream(kind, mode, async (write) => {
    let wrote = false;
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        write(event.delta.text);
        wrote = true;
      }
    }
    const message = await stream.finalMessage();
    if (!wrote || message.stop_reason === "refusal") {
      write((wrote ? " " : "") + FALLBACK_LINE[setup.language]);
    }
  });
}

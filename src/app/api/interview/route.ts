import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { demoTurn } from "@/lib/demo";
import { buildMessages, INTERVIEWER_SYSTEM, isFinalTurn } from "@/lib/prompts";
import { interviewProgress, type InterviewRequest } from "@/lib/types";
import { parseSetup, parseTranscript } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const FALLBACK_LINE = {
  en: "Sorry, I lost my train of thought for a second. Could you tell me a bit more about that?",
  ar: "عذراً، فقدت تركيزي للحظة. هل يمكنك أن تخبرني المزيد عن ذلك؟",
} as const;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function validate(body: unknown): InterviewRequest | string {
  const b = body as Partial<InterviewRequest> | null;
  const setup = parseSetup(b?.setup);
  if (typeof setup === "string") return setup;
  const transcript = parseTranscript(b?.transcript);
  if (typeof transcript === "string") return transcript;
  // The client asks for the next interviewer turn only after the candidate has answered (or at the very start).
  if (transcript.length % 2 !== 0) return "Waiting for the candidate's answer.";
  return { setup, transcript };
}

function textStream(final: boolean, produce: (write: (text: string) => void) => Promise<void>) {
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
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Tells the client this turn closes the interview, so it stops listening afterwards.
      "X-Interview-Final": final ? "1" : "0",
    },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const parsed = validate(body);
  if (typeof parsed === "string") return fail(parsed, 400);
  const { setup, transcript } = parsed;

  // Demo mode: a scripted interviewer, streamed word by word, so anyone can try the voice loop without an API key.
  if (!process.env.ANTHROPIC_API_KEY) {
    const { asked } = interviewProgress(transcript, setup.questionCount);
    const closing = asked >= Math.min(setup.questionCount, 5);
    const line = demoTurn(setup, asked, closing);
    return textStream(closing, async (write) => {
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
    if (error instanceof Anthropic.RateLimitError) return fail("The interviewer is busy. Please wait a moment and try again.", 429);
    if (error instanceof Anthropic.AuthenticationError) return fail("Server API key is invalid.", 500);
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      return fail("The interviewer had a problem. Please try again.", 502);
    }
    console.error(error);
    return fail("Something went wrong. Please try again.", 500);
  }

  const final = isFinalTurn(setup, transcript);
  return textStream(final, async (write) => {
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

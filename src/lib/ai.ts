import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

/**
 * One small interface over two AI providers, so every feature works with either:
 * - Claude (Anthropic) when ANTHROPIC_API_KEY is set: paid, strongest quality.
 * - Gemini (Google) when GEMINI_API_KEY is set: has a free tier.
 * With neither key the app runs in demo mode (callers check `activeProvider()`).
 */
export type Provider = "claude" | "gemini";

export function activeProvider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

const CLAUDE_MODEL = "claude-opus-5-5";
// Flash-Lite has the most generous free-tier quota; override with GEMINI_MODEL if needed.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Effort = "low" | "medium";

/** An error whose message is safe to show to users. */
export class AIError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  const status =
    error instanceof Anthropic.APIError ? error.status : error instanceof ApiError ? error.status : undefined;
  if (status === 429) return new AIError("The AI is busy right now (usage limit reached). Please try again in a minute.", 429);
  if (status === 401 || status === 403) return new AIError("The server's AI key is invalid.", 500);
  console.error("AI provider error", status, error instanceof Error ? error.message : error);
  return new AIError("The AI had a problem. Please try again.", 502);
}

let claudeClient: Anthropic | undefined;
let geminiClient: GoogleGenAI | undefined;
const claude = () => (claudeClient ??= new Anthropic());
const gemini = () => (geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

function geminiContents(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
}

function requireProvider(): Provider {
  const provider = activeProvider();
  if (!provider) throw new AIError("AI is not configured on this server.", 500);
  return provider;
}

/**
 * Streams a chat reply as text chunks. Provider errors (auth, rate limits) are thrown before
 * the first chunk, so callers can still answer with a proper HTTP error.
 */
export async function streamChat(opts: { system: string; messages: ChatMessage[]; maxTokens: number }): Promise<AsyncIterable<string>> {
  const provider = requireProvider();
  try {
    if (provider === "claude") {
      const stream = claude().beta.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Low effort keeps a spoken conversation snappy.
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: opts.system,
        messages: opts.messages,
      });
      await stream.withResponse();
      return (async function* () {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
        }
      })();
    }

    const stream = await gemini().models.generateContentStream({
      model: GEMINI_MODEL,
      contents: geminiContents(opts.messages),
      config: { systemInstruction: opts.system, maxOutputTokens: opts.maxTokens },
    });
    return (async function* () {
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    })();
  } catch (error) {
    throw toAIError(error);
  }
}

/** Gemini's JSON-schema support is a subset: drop keys it doesn't accept. */
export function geminiJsonSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Returns a typed object that matches the Zod schema, or throws an AIError. */
export async function generateObject<T extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: T;
  effort: Effort;
  maxTokens: number;
}): Promise<z.infer<T>> {
  const provider = requireProvider();
  try {
    if (provider === "claude") {
      const response = await claude().beta.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        throw new AIError("The AI couldn't complete this request. Please try again.", 502);
      }
      return response.parsed_output as z.infer<T>;
    }

    const response = await gemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: opts.prompt,
      config: {
        systemInstruction: opts.system,
        maxOutputTokens: opts.maxTokens,
        responseMimeType: "application/json",
        responseJsonSchema: geminiJsonSchema(opts.schema),
      },
    });
    let data: unknown;
    try {
      data = JSON.parse(response.text ?? "");
    } catch {
      throw new AIError("The AI returned an unexpected response. Please try again.", 502);
    }
    const parsed = opts.schema.safeParse(data);
    if (!parsed.success) throw new AIError("The AI returned an unexpected response. Please try again.", 502);
    return parsed.data;
  } catch (error) {
    throw toAIError(error);
  }
}

/** Converts a PDF into plain text, following the given instruction. */
export async function readPdf(opts: { pdfBase64: string; instruction: string; maxTokens: number }): Promise<string> {
  const provider = requireProvider();
  try {
    if (provider === "claude") {
      const response = await claude().beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: opts.pdfBase64 } },
              { type: "text", text: opts.instruction },
            ],
          },
        ],
      });
      if (response.stop_reason === "refusal") throw new AIError("Couldn't read this PDF. Please paste your CV as text.", 422);
      return response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    }

    const response = await gemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: "application/pdf", data: opts.pdfBase64 } }, { text: opts.instruction }],
        },
      ],
      config: { maxOutputTokens: opts.maxTokens },
    });
    return (response.text ?? "").trim();
  } catch (error) {
    throw toAIError(error);
  }
}

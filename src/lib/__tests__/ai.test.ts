import { afterEach, describe, expect, it } from "vitest";
import { activeProvider, geminiJsonSchema } from "../ai";
import { CodingTaskSchema } from "../coding";
import { ScorecardSchema } from "../scorecard";

const saved = { anthropic: process.env.ANTHROPIC_API_KEY, gemini: process.env.GEMINI_API_KEY };
afterEach(() => {
  process.env.ANTHROPIC_API_KEY = saved.anthropic ?? "";
  process.env.GEMINI_API_KEY = saved.gemini ?? "";
});

describe("activeProvider", () => {
  it("runs in demo mode without keys", () => {
    process.env.ANTHROPIC_API_KEY = "";
    process.env.GEMINI_API_KEY = "";
    expect(activeProvider()).toBeNull();
  });

  it("uses the free Gemini tier when only a Gemini key is set", () => {
    process.env.ANTHROPIC_API_KEY = "";
    process.env.GEMINI_API_KEY = "test";
    expect(activeProvider()).toBe("gemini");
  });

  it("prefers Claude when both keys are set", () => {
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.GEMINI_API_KEY = "test";
    expect(activeProvider()).toBe("claude");
  });
});

// Keywords Gemini's responseJsonSchema accepts (from the @google/genai docs).
const SUPPORTED = new Set([
  "$id", "$defs", "$ref", "$anchor", "type", "format", "title", "description", "enum", "items", "prefixItems",
  "minItems", "maxItems", "minimum", "maximum", "anyOf", "oneOf", "properties", "additionalProperties", "required",
  "propertyOrdering",
]);

function unsupportedKeys(node: unknown, path = "#"): string[] {
  if (Array.isArray(node)) return node.flatMap((n, i) => unsupportedKeys(n, `${path}/${i}`));
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) => {
    // Property names under "properties" / "$defs" are user field names, not keywords.
    if (key === "properties" || key === "$defs") {
      return Object.entries(value as object).flatMap(([name, sub]) => unsupportedKeys(sub, `${path}/${key}/${name}`));
    }
    return [...(SUPPORTED.has(key) ? [] : [`${path}/${key}`]), ...unsupportedKeys(value, `${path}/${key}`)];
  });
}

describe("geminiJsonSchema", () => {
  it.each([
    ["scorecard", ScorecardSchema],
    ["coding task", CodingTaskSchema],
  ])("converts the %s schema using only keywords Gemini supports", (_name, schema) => {
    const json = geminiJsonSchema(schema);
    expect(json.type).toBe("object");
    expect(unsupportedKeys(json)).toEqual([]);
  });
});

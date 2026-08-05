// ============================================================
// Anthropic client + low-level model call. Server-only.
// The API key is read from env and NEVER exposed to the client.
// Every call is logged to AiLog by the caller (see lib/consult.ts).
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "@/lib/env";

// Lazily construct the client so importing this module at build time
// (when ANTHROPIC_API_KEY may be absent) does not throw.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return client;
}

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
}

export interface RawCall {
  prompt: string; // the full user content we sent (for AiLog)
  response: string; // raw text the model returned (for AiLog)
  model: string;
}

/**
 * Send a system prompt + a single user message and return the raw text.
 * Keeping this thin makes the higher-level consult logic easy to test.
 */
export async function callModel(params: {
  system: string;
  userContent: string;
  maxTokens?: number;
}): Promise<RawCall> {
  const model = getModel();
  const res = await getClient().messages.create({
    model,
    max_tokens: params.maxTokens ?? 1400,
    system: params.system,
    messages: [{ role: "user", content: params.userContent }],
  });

  const response = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { prompt: params.userContent, response, model };
}

/**
 * Extract a JSON object from a model response that should be pure JSON but
 * might occasionally be wrapped in prose or code fences. Returns null if
 * nothing parseable is found.
 */
export function parseJsonObject<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  // Fast path: whole thing is JSON.
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to the first {...} block.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

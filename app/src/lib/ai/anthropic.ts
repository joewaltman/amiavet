// Server-only Anthropic client. Every call writes an AiLog row.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { prisma } from "@/lib/db";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";

// Two-model setup: a mid-tier model for owner-facing triage (higher volume,
// speed matters) and a stronger model for the vet-review probe (low volume,
// nuance matters). ANTHROPIC_MODEL is kept as a fallback so a single-model
// deploy still works.
const FALLBACK_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
export const OWNER_MODEL = process.env.ANTHROPIC_MODEL_OWNER ?? FALLBACK_MODEL;
export const VET_MODEL = process.env.ANTHROPIC_MODEL_VET ?? FALLBACK_MODEL;

let _client: Anthropic | null = null;
export function anthropicClient() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

// -------------------------------------------------------------------
// callAnthropicJson
//
// Shared helper for calls that expect a JSON object back. Handles:
//   * SDK call + latency + AiLog write
//   * "assistant: {" bias trick, since @anthropic-ai/sdk@0.115.0 has no
//     hard JSON mode parameter
//   * strict schema validation
//
// Returns { data, raw } — raw is included for callers that want to log
// it or use it as a fallback.
// -------------------------------------------------------------------
export async function callAnthropicJson<T>(opts: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  schema: ZodType<T>;
  kind: string;
  consultId?: string | null;
  vetReviewId?: string | null;
}): Promise<{ data: T; raw: string }> {
  const start = Date.now();
  const resp = await anthropicClient().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.systemPrompt,
    messages: [
      { role: "user", content: opts.userPrompt },
      // Bias the model toward pure JSON by pre-filling the assistant turn
      // with an opening brace. We prepend it back to the response before
      // parsing.
      { role: "assistant", content: "{" },
    ],
  });
  const latencyMs = Date.now() - start;

  const body = resp.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("")
    .trim();
  // We pre-filled the assistant turn with "{" so the SDK response is the
  // continuation from that character. Stitch it back on unless the model
  // happened to echo it (rare, but harmless to guard against).
  const raw = body.startsWith("{") ? body : "{" + body;

  await prisma.aiLog.create({
    data: {
      consultId: opts.consultId ?? null,
      vetReviewId: opts.vetReviewId ?? null,
      model: opts.model,
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      response: raw,
      inputTokens: resp.usage?.input_tokens ?? null,
      outputTokens: resp.usage?.output_tokens ?? null,
      latencyMs,
      kind: opts.kind,
    },
  });

  const parsed = tryParseJsonObject(raw);
  const validated = opts.schema.parse(parsed);
  return { data: validated, raw };
}

// Extract the first {...} block and JSON.parse it. Throws on failure —
// callers should catch and either retry or fall back.
function tryParseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("no JSON object in response");
}

// Build the user turn for a vet probe: pet context + question + prior answer.
function buildVetProbeMessage(
  question: string,
  petContext: string,
  priorAnswer: string
): string {
  const ctx = petContext.trim()
    ? `<pet_context>\n${petContext.trim()}\n</pet_context>\n\n`
    : "";
  return `${ctx}<owner_question>\n${question.trim()}\n</owner_question>\n\n<prior_ai_answer>\n${priorAnswer}\n</prior_ai_answer>`;
}

// Vet-side probe. Free-form Q → A, logged against the vet review.
export async function vetProbe(opts: {
  vetReviewId: string;
  consultId: string;
  question: string;
  petContext: string;
  priorAnswer: string;
}): Promise<string> {
  const sys = `${SYSTEM_PROMPT}\n\nYou are now answering a licensed veterinarian's follow-up question while they review a prior AI answer. Be more technical. Cite differentials by name. Still refuse to prescribe.`;
  const userMessage = buildVetProbeMessage(
    opts.question,
    opts.petContext,
    opts.priorAnswer
  );

  const start = Date.now();
  const resp = await anthropicClient().messages.create({
    model: VET_MODEL,
    max_tokens: 1500,
    system: sys,
    messages: [{ role: "user", content: userMessage }],
  });
  const latencyMs = Date.now() - start;
  const raw = resp.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n")
    .trim();

  await prisma.aiLog.create({
    data: {
      consultId: opts.consultId,
      vetReviewId: opts.vetReviewId,
      model: VET_MODEL,
      systemPrompt: sys,
      userPrompt: userMessage,
      response: raw,
      inputTokens: resp.usage?.input_tokens ?? null,
      outputTokens: resp.usage?.output_tokens ?? null,
      latencyMs,
      kind: "vet_probe",
    },
  });

  return raw;
}

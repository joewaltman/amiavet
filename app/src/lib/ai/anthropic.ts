// Server-only Anthropic client. Every call writes an AiLog row.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";

// Two-model setup: a mid-tier model for owner-facing triage (higher volume,
// speed matters) and a stronger model for the vet-review probe (low volume,
// nuance matters). ANTHROPIC_MODEL is kept as a fallback so a single-model
// deploy still works.
const FALLBACK_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
const OWNER_MODEL = process.env.ANTHROPIC_MODEL_OWNER ?? FALLBACK_MODEL;
const VET_MODEL = process.env.ANTHROPIC_MODEL_VET ?? FALLBACK_MODEL;

let _client: Anthropic | null = null;
function client() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

export type AiAnswer = {
  emergency: boolean;
  urgency: "emergency" | "same-day" | "routine" | "info";
  needsFollowup: boolean;
  followupQuestion: string | null;
  answer: string;
  summary: string;
};

// Build the user turn for the model: pet context (if any) + the question.
function buildUserMessage(question: string, petContext: string): string {
  const ctx = petContext.trim()
    ? `<pet_context>\n${petContext.trim()}\n</pet_context>\n\n`
    : "";
  return `${ctx}<owner_question>\n${question.trim()}\n</owner_question>`;
}

// Draft an owner-facing answer.
export async function generateAnswer(opts: {
  consultId: string;
  question: string;
  petContext: string;
}): Promise<AiAnswer> {
  const userMessage = buildUserMessage(opts.question, opts.petContext);
  const start = Date.now();
  const resp = await client().messages.create({
    model: OWNER_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  const latencyMs = Date.now() - start;

  const raw = resp.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n")
    .trim();

  const parsed = safeParseJson(raw);

  await prisma.aiLog.create({
    data: {
      consultId: opts.consultId,
      model: OWNER_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userMessage,
      response: raw,
      inputTokens: resp.usage?.input_tokens ?? null,
      outputTokens: resp.usage?.output_tokens ?? null,
      latencyMs,
      kind: "owner_ask",
    },
  });

  return parsed;
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
  const userMessage = `${buildUserMessage(opts.question, opts.petContext)}\n\n<prior_ai_answer>\n${opts.priorAnswer}\n</prior_ai_answer>`;

  const start = Date.now();
  const resp = await client().messages.create({
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

// Best-effort JSON parse. If the model returns markdown with a code fence
// or extra prose, extract the first {...} block and try that.
function safeParseJson(raw: string): AiAnswer {
  const fallback: AiAnswer = {
    emergency: false,
    urgency: "info",
    needsFollowup: false,
    followupQuestion: null,
    answer: raw,
    summary: raw.slice(0, 240),
  };
  try {
    return coerce(JSON.parse(raw));
  } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return coerce(JSON.parse(match[0]));
    } catch {}
  }
  return fallback;
}

function coerce(o: unknown): AiAnswer {
  const x = o as Record<string, unknown>;
  const urgency = (x.urgency as AiAnswer["urgency"]) ?? "info";
  return {
    emergency: Boolean(x.emergency),
    urgency: ["emergency", "same-day", "routine", "info"].includes(urgency)
      ? urgency
      : "info",
    needsFollowup: Boolean(x.needsFollowup),
    followupQuestion: (x.followupQuestion as string | null) ?? null,
    answer: String(x.answer ?? ""),
    summary: String(x.summary ?? ""),
  };
}

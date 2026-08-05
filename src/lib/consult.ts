// ============================================================
// Consult orchestration: the server-side loop that turns an owner's
// question into an AI follow-up or a structured answer. Thin routes call
// into here. Every model call is logged to AiLog.
// ============================================================
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { callModel, parseJsonObject } from "@/lib/ai/anthropic";
import { buildPetContext } from "@/lib/ai/petContext";
import { regeneratePetSummary } from "@/lib/ai/summary";
import {
  AiResult,
  MAX_FOLLOWUP_ROUNDS,
  MAX_FOLLOWUP_QUESTIONS,
} from "@/lib/ai/types";
import { Prisma, type MessageRole, type Urgency } from "@prisma/client";

const VALID_URGENCY: Urgency[] = ["info", "monitor", "see_vet", "urgent"];

function label(role: MessageRole): string {
  switch (role) {
    case "owner":
      return "OWNER";
    case "ai":
      return "AMIA (AI)";
    case "vet":
      return "VETERINARIAN";
    default:
      return "SYSTEM";
  }
}

// A conservative fallback if the model returns something unparseable.
function fallbackAnswer(): AiResult {
  return {
    type: "answer",
    emergency: false,
    urgency: "see_vet",
    answer: {
      emergencyNotice: null,
      whatThisMightMean:
        "I wasn't able to fully analyze this one. There are several possible explanations, and I don't want to guess.",
      whatToWatchFor:
        "Any worsening, trouble breathing, collapse, repeated vomiting, or a pet that seems to be in pain or declining.",
      atHome: "Keep your pet calm and comfortable and make sure they have access to water.",
      urgencyRead:
        "To be safe, I'd recommend having a California-licensed veterinarian look at this, either a $20 review of your question or a $40 video visit.",
    },
    summaryUpdate: "Owner asked a question that Amia could not confidently analyze; recommended a vet review.",
  };
}

function normalize(parsed: AiResult | null, forceAnswer: boolean): AiResult {
  if (!parsed) return fallbackAnswer();

  const urgency: Urgency = VALID_URGENCY.includes(parsed.urgency) ? parsed.urgency : "see_vet";
  let type = parsed.type === "followup" ? "followup" : "answer";

  // Enforce the follow-up cap: once we've asked enough, force an answer.
  if (forceAnswer) type = "answer";

  if (type === "followup") {
    const qs = (parsed.followupQuestions ?? [])
      .filter((q) => typeof q === "string" && q.trim().length > 0)
      .slice(0, MAX_FOLLOWUP_QUESTIONS);
    if (qs.length === 0) return fallbackAnswer(); // model said followup but gave none
    return {
      type: "followup",
      emergency: !!parsed.emergency,
      urgency,
      followupQuestions: qs,
      summaryUpdate: parsed.summaryUpdate,
    };
  }

  // type === "answer"
  const a = parsed.answer;
  if (!a || typeof a.whatThisMightMean !== "string") return fallbackAnswer();
  return {
    type: "answer",
    emergency: !!parsed.emergency,
    urgency,
    answer: {
      emergencyNotice: a.emergencyNotice ?? null,
      whatThisMightMean: a.whatThisMightMean ?? "",
      whatToWatchFor: a.whatToWatchFor ?? "",
      atHome: a.atHome ?? "",
      urgencyRead: a.urgencyRead ?? "",
    },
    summaryUpdate: parsed.summaryUpdate,
  };
}

function renderFollowup(r: AiResult): string {
  const intro = r.emergency
    ? "Before I say more, I need to check something important:"
    : "I want to make sure I give you a useful answer. A couple of quick questions:";
  return `${intro}\n${(r.followupQuestions ?? []).map((q) => `• ${q}`).join("\n")}`;
}

function renderAnswer(r: AiResult): string {
  const a = r.answer!;
  const parts: string[] = [];
  if (a.emergencyNotice) parts.push(`⚠️ ${a.emergencyNotice}`);
  if (a.whatThisMightMean) parts.push(`What this might mean:\n${a.whatThisMightMean}`);
  if (a.whatToWatchFor) parts.push(`What to watch for:\n${a.whatToWatchFor}`);
  if (a.atHome) parts.push(`What you can safely do at home:\n${a.atHome}`);
  if (a.urgencyRead) parts.push(`Urgency read:\n${a.urgencyRead}`);
  return parts.join("\n\n");
}

/**
 * Run one AI turn on an existing consult: read the thread, call the model,
 * log it, persist the AI message, and update urgency. Regenerates the pet
 * summary when a final answer is produced.
 */
export async function runConsultTurn(consultId: string): Promise<AiResult> {
  const consult = await prisma.consult.findUnique({
    where: { id: consultId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!consult) throw new Error("Consult not found");

  const context = await buildPetContext(consult.petId);

  const followupRounds = consult.messages.filter(
    (m) => m.role === "ai" && (m.metadata as { type?: string } | null)?.type === "followup",
  ).length;
  const forceAnswer = followupRounds >= MAX_FOLLOWUP_ROUNDS;

  const transcript = consult.messages.map((m) => `${label(m.role)}: ${m.content}`).join("\n");
  const userContent = [
    context,
    "\nCONVERSATION SO FAR:",
    transcript,
    forceAnswer
      ? "\nYou have already asked follow-up questions. Provide your best answer now; do not ask more questions."
      : "",
    "\nRespond now with the single JSON object specified in your instructions.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callModel({ system: SYSTEM_PROMPT, userContent });

  // Audit: log every prompt/response.
  await prisma.aiLog.create({
    data: { consultId, prompt: userContent, response: raw.response, model: raw.model },
  });

  const result = normalize(parseJsonObject<AiResult>(raw.response), forceAnswer);
  const content = result.type === "followup" ? renderFollowup(result) : renderAnswer(result);

  const metadata = {
    type: result.type,
    urgency: result.urgency,
    emergency: result.emergency,
    answer: result.answer ?? null,
    followupQuestions: result.followupQuestions ?? null,
    summary: result.summaryUpdate ?? null,
  };

  await prisma.consultMessage.create({
    data: {
      consultId,
      role: "ai",
      content,
      // Cast our typed object to Prisma's JSON input type.
      metadata: metadata as unknown as Prisma.InputJsonObject,
    },
  });

  await prisma.consult.update({ where: { id: consultId }, data: { urgency: result.urgency } });

  if (result.type === "answer") {
    await regeneratePetSummary(consult.petId, consultId);
  }

  return result;
}

/**
 * Create a new consult from an owner's question and run the first AI turn.
 * Returns the new consult id.
 */
export async function createConsult(params: {
  userId: string;
  petId: string;
  question: string;
}): Promise<string> {
  const consult = await prisma.consult.create({
    data: {
      userId: params.userId,
      petId: params.petId,
      status: "ai_answered",
      messages: { create: { role: "owner", content: params.question.trim() } },
    },
  });
  await runConsultTurn(consult.id);
  return consult.id;
}

/** Owner answers the AI's follow-up (or adds more detail); runs another turn. */
export async function addOwnerReply(consultId: string, text: string): Promise<AiResult> {
  await prisma.consultMessage.create({
    data: { consultId, role: "owner", content: text.trim() },
  });
  return runConsultTurn(consultId);
}

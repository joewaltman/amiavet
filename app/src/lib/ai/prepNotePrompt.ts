// Vet pre-call prep note.
//
// Generates a short (3-4 line) internal summary a veterinarian can skim
// before opening the full case. Two entry points call this:
//
//   1. Stripe webhook when a $20 vet review is paid for.
//   2. Cal.com webhook when a $40 video visit is booked.
//
// The prep note is a *cached snapshot* stored on Consult.vetPrepNote —
// it is never the source of truth. The vet case page still renders the
// full owner question, follow-ups, and AI answer from the messages
// table. If the prep note is missing or stale, the case page still works.
//
// Design constraints:
//   * Prose, not JSON. The prompt explicitly forbids JSON so we don't
//     accidentally inherit the owner-facing SYSTEM_PROMPT's schema
//     requirement.
//   * Grounded: the prompt is instructed to summarize ONLY from the
//     material we hand it. No hallucinated pet history, no invented
//     symptoms.
//   * Clinical: written for a licensed vet — differential language is
//     fine, hedged owner-facing language is unnecessary.
//   * Best-effort: callers should catch and log errors; a failed prep
//     note must never fail the webhook that triggered it.
import "server-only";
import { prisma } from "@/lib/db";
import { anthropicClient, VET_MODEL } from "@/lib/ai/anthropic";
import { buildPetContext } from "@/lib/ai/petContext";
import {
  AnswerResultSchema,
  TriageResultSchema,
  type AnswerResult,
  type TriageResult,
} from "@/lib/ai/schemas";

// System prompt: prose, grounded, clinical. Kept separate from
// SYSTEM_PROMPT (which enforces owner-facing JSON output).
const PREP_NOTE_SYSTEM_PROMPT = `You are Amia, drafting a pre-visit prep note for a licensed veterinarian who is about to review or meet with a pet owner.

Your job: distill the case into 3 to 4 short lines the vet can skim in under 15 seconds. Write like a colleague handing off a chart.

Rules:
- Ground every statement in the material provided. Do NOT invent history, symptoms, meds, or prior visits that are not in the input.
- Be brief and clinical. Differentials by name are welcome; owner-facing hedging is not.
- If the AI flagged an urgency level, mention it once.
- If the owner explicitly wants something addressed (medication question, follow-up on prior advice, etc.), surface it.
- If a field is unknown, omit it. Do not write "unknown" filler.
- Plain prose. No headings, no bullet lists, no JSON. Just 3 to 4 sentences separated by newlines.
- Do not restate the owner's question verbatim — the vet has it one click away.`;

// Build the user turn. All facts come from consult + pet + message
// metadata; the model has nothing else to draw on, which is the point.
function buildUserPrompt(opts: {
  petContext: string;
  question: string;
  aiAnswer: string | null;
  urgency: string | null;
  emergencyFlag: boolean;
  triage: TriageResult | null;
  answer: AnswerResult | null;
  followupAnswers: Record<string, unknown> | null;
}): string {
  const chunks: string[] = [];

  chunks.push(
    `<pet_context>\n${opts.petContext.trim() || "No pet on file."}\n</pet_context>`
  );

  chunks.push(`<owner_question>\n${opts.question.trim()}\n</owner_question>`);

  if (opts.triage) {
    const t = opts.triage;
    const intakeLines: string[] = [
      `chiefComplaint: ${t.intake.chiefComplaint}`,
    ];
    if (t.intake.duration) intakeLines.push(`duration: ${t.intake.duration}`);
    if (t.intake.redFlagsMatched.length > 0) {
      intakeLines.push(`redFlags: ${t.intake.redFlagsMatched.join(", ")}`);
    }
    if (t.intake.notes) intakeLines.push(`notes: ${t.intake.notes}`);
    intakeLines.push(`decision: ${t.decision}`);
    if (t.emergencyReason) {
      intakeLines.push(`emergencyReason: ${t.emergencyReason}`);
    }
    chunks.push(`<triage>\n${intakeLines.join("\n")}\n</triage>`);

    if (t.followups.length > 0) {
      const rows = t.followups.map((f) => {
        const raw = opts.followupAnswers?.[f.id];
        const shown =
          raw === null || raw === undefined
            ? "(skipped)"
            : Array.isArray(raw)
              ? raw.join(", ")
              : String(raw);
        return `- Q: ${f.question}\n  A: ${shown}`;
      });
      chunks.push(`<followups>\n${rows.join("\n")}\n</followups>`);
    }
  }

  if (opts.answer) {
    const a = opts.answer;
    const answerLines = [
      `urgency: ${a.urgency}`,
      `isEmergency: ${a.isEmergency}`,
      `summary: ${a.summary}`,
    ];
    if (a.watchFor.length > 0) {
      answerLines.push(`watchFor: ${a.watchFor.join("; ")}`);
    }
    if (a.whenToSeeVet) answerLines.push(`whenToSeeVet: ${a.whenToSeeVet}`);
    chunks.push(`<ai_answer_structured>\n${answerLines.join("\n")}\n</ai_answer_structured>`);
  } else if (opts.aiAnswer) {
    // Older consults may not have a structured AnswerResult stored;
    // fall back to the plain-text aiAnswer field.
    const urgencyLine = opts.urgency ? `urgency: ${opts.urgency}\n` : "";
    chunks.push(
      `<ai_answer_prose>\n${urgencyLine}${opts.aiAnswer.trim()}\n</ai_answer_prose>`
    );
  }

  if (opts.emergencyFlag) {
    chunks.push(`<emergency_flag>true</emergency_flag>`);
  }

  chunks.push(
    "Write the 3-4 line prep note now. No headings, no bullets, no JSON."
  );
  return chunks.join("\n\n");
}

// Pull structured triage + answer out of the ConsultMessage rows if
// available. Both are stored as JSON metadata by the two-stage flow;
// older consults may only have the flat aiAnswer / urgency fields.
function extractStructured(
  messages: Array<{ role: string; metadata: unknown }>
): { triage: TriageResult | null; answer: AnswerResult | null; followupAnswers: Record<string, unknown> | null } {
  const aiMsg = [...messages].reverse().find((m) => m.role === "ai");
  const triageMsg = messages.find((m) => m.role === "system");

  let answer: AnswerResult | null = null;
  if (aiMsg?.metadata) {
    const parsed = AnswerResultSchema.safeParse(aiMsg.metadata);
    if (parsed.success) answer = parsed.data;
  }

  let triage: TriageResult | null = null;
  let followupAnswers: Record<string, unknown> | null = null;
  if (triageMsg?.metadata && typeof triageMsg.metadata === "object") {
    const meta = triageMsg.metadata as Record<string, unknown>;
    const attempt = TriageResultSchema.safeParse({
      intake: meta.intake,
      decision: meta.decision,
      followups: meta.followups ?? [],
      emergencyReason: meta.emergencyReason ?? null,
    });
    if (attempt.success) triage = attempt.data;
    if (meta.followupAnswers && typeof meta.followupAnswers === "object") {
      followupAnswers = meta.followupAnswers as Record<string, unknown>;
    }
  }
  return { triage, answer, followupAnswers };
}

// Main entry point. Loads the consult, calls Anthropic, stores the note
// on Consult.vetPrepNote, and writes an AiLog row. Returns the note
// string (or throws — callers are responsible for catching so a failed
// prep note never breaks the payment/booking webhook).
export async function generateAndStorePrepNote(
  consultId: string
): Promise<string> {
  const consult = await prisma.consult.findUnique({
    where: { id: consultId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!consult) throw new Error(`consult ${consultId} not found`);

  const petContext = consult.petId
    ? await buildPetContext(consult.petId)
    : "No pet on file.";

  const { triage, answer, followupAnswers } = extractStructured(
    consult.messages
  );

  const userPrompt = buildUserPrompt({
    petContext,
    question: consult.question,
    aiAnswer: consult.aiAnswer,
    urgency: consult.urgency,
    emergencyFlag: consult.emergencyFlag,
    triage,
    answer,
    followupAnswers,
  });

  const start = Date.now();
  const resp = await anthropicClient().messages.create({
    model: VET_MODEL,
    max_tokens: 400,
    system: PREP_NOTE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const latencyMs = Date.now() - start;

  const note = resp.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n")
    .trim();

  if (!note) {
    throw new Error("empty prep note from model");
  }

  await prisma.$transaction([
    prisma.consult.update({
      where: { id: consultId },
      data: { vetPrepNote: note, vetPrepNoteAt: new Date() },
    }),
    prisma.aiLog.create({
      data: {
        consultId,
        model: VET_MODEL,
        systemPrompt: PREP_NOTE_SYSTEM_PROMPT,
        userPrompt,
        response: note,
        inputTokens: resp.usage?.input_tokens ?? null,
        outputTokens: resp.usage?.output_tokens ?? null,
        latencyMs,
        kind: "vet_prep_note",
      },
    }),
  ]);

  return note;
}

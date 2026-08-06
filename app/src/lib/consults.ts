// Save a completed two-stage session as a Consult + transcript.
// Called by /api/consults/save (auth) and /api/consults/complete-save
// (post-login replay from a signed cookie).
import { prisma } from "@/lib/db";
import { regeneratePetSummary } from "@/lib/petSummary";
import type {
  AnswerResult,
  FollowupAnswers,
  TriageResult,
} from "@/lib/ai/schemas";

export type PersistSessionInput = {
  ownerId: string;
  petId: string | null;
  questionText: string;
  triage: TriageResult;
  followupAnswers: FollowupAnswers;
  answer: AnswerResult;
};

// Turns the structured answer into a plain-text render for storage in
// Consult.aiAnswer, which the vet-review UI reads directly.
export function renderAnswer(answer: AnswerResult): string {
  const lines: string[] = [];
  lines.push(answer.summary.trim());
  if (answer.watchFor.length > 0) {
    lines.push("");
    lines.push("Watch for:");
    for (const w of answer.watchFor) lines.push(`- ${w}`);
  }
  if (answer.atHome.length > 0) {
    lines.push("");
    lines.push("At home:");
    for (const a of answer.atHome) lines.push(`- ${a}`);
  }
  if (answer.whenToSeeVet?.trim()) {
    lines.push("");
    lines.push(`When to see a vet: ${answer.whenToSeeVet.trim()}`);
  }
  return lines.join("\n");
}

export async function persistSession(
  input: PersistSessionInput
): Promise<{ consultId: string }> {
  // Resolve pet ownership: if petId is provided, it must belong to the
  // ownerId; otherwise drop it. This is defensive — the API layer also
  // checks — but keeps the transaction self-consistent.
  let petId = input.petId;
  if (petId) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true },
    });
    if (!pet || pet.ownerId !== input.ownerId) petId = null;
  }

  const rendered = renderAnswer(input.answer);

  const consult = await prisma.$transaction(async (tx) => {
    const c = await tx.consult.create({
      data: {
        ownerId: input.ownerId,
        petId: petId ?? undefined,
        status: "ai_answered",
        question: input.questionText,
        followups: input.followupAnswers as unknown as object,
        aiAnswer: rendered,
        urgency: input.answer.urgency,
        aiSummary: input.answer.summary,
        emergencyFlag: input.answer.isEmergency,
      },
    });

    await tx.consultMessage.createMany({
      data: [
        {
          consultId: c.id,
          role: "owner",
          content: input.questionText,
        },
        {
          consultId: c.id,
          role: "system",
          content: "Triage",
          metadata: {
            intake: input.triage.intake,
            decision: input.triage.decision,
            followups: input.triage.followups,
            followupAnswers: input.followupAnswers,
            emergencyReason: input.triage.emergencyReason ?? null,
          } as unknown as object,
        },
        {
          consultId: c.id,
          role: "ai",
          content: rendered,
          metadata: input.answer as unknown as object,
        },
      ],
    });

    return c;
  });

  // Fire-and-forget summary refresh. Never blocks the caller.
  if (petId) {
    regeneratePetSummary(petId).catch((err) => {
      console.error("regeneratePetSummary failed:", err);
    });
  }

  return { consultId: consult.id };
}

// Consult creation helpers shared between the /api/ask route and the
// dashboard's draft-completion path.
import { prisma } from "@/lib/db";
import { generateAnswer } from "@/lib/ai/anthropic";
import { buildPetContext } from "@/lib/ai/history";

export async function createConsult(opts: {
  ownerId: string;
  question: string;
  petId?: string;
}) {
  // Pick the default pet if the owner has exactly one and didn't specify.
  let petId = opts.petId ?? null;
  if (!petId) {
    const only = await prisma.pet.findMany({
      where: { ownerId: opts.ownerId },
      take: 2,
    });
    if (only.length === 1) petId = only[0].id;
  }

  const consult = await prisma.consult.create({
    data: {
      ownerId: opts.ownerId,
      petId: petId ?? undefined,
      question: opts.question,
      status: "ai_answered",
    },
  });

  // Kick off the AI answer. We do this inline so the owner sees the response
  // on the next page load — the volumes are small and Anthropic is fast.
  try {
    const petContext = petId ? await buildPetContext(petId) : "";
    const ai = await generateAnswer({
      consultId: consult.id,
      question: opts.question,
      petContext,
    });
    await prisma.consult.update({
      where: { id: consult.id },
      data: {
        aiAnswer: ai.answer,
        aiUrgency: ai.urgency,
        aiSummary: ai.summary,
        emergencyFlag: ai.emergency,
      },
    });
  } catch (err) {
    console.error("AI answer failed:", err);
    // Leave aiAnswer null; the consult page will show a fallback.
  }

  return consult;
}

// Compact pet-context builder. Feeds the model a small, readable block that
// captures the pet's static profile, its rolling AI-maintained summary, and
// the summaries of the most recent consults.
import { prisma } from "@/lib/db";

const RECENT_CONSULT_LIMIT = 3;

export async function buildPetContext(petId: string): Promise<string> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      summary: true,
      consults: {
        orderBy: { createdAt: "desc" },
        take: RECENT_CONSULT_LIMIT,
        select: { createdAt: true, aiSummary: true, question: true },
      },
    },
  });
  if (!pet) return "";

  const parts: string[] = [];
  parts.push(
    `Pet profile:\n- Name: ${pet.name}\n- Species: ${pet.species}\n- Breed: ${pet.breed ?? "unknown"}\n- Sex: ${pet.sex ?? "unknown"}${pet.neutered != null ? ` (${pet.neutered ? "neutered/spayed" : "intact"})` : ""}\n- Birth date: ${pet.birthDate ? pet.birthDate.toISOString().slice(0, 10) : "unknown"}\n- Weight: ${pet.weightKg ? `${pet.weightKg} kg` : "unknown"}\n- Chronic conditions: ${pet.conditions ?? "none listed"}\n- Medications: ${pet.medications ?? "none listed"}\n- Allergies: ${pet.allergies ?? "none listed"}\n- Notes: ${pet.notes ?? "none"}`
  );

  if (pet.summary?.runningSummary) {
    parts.push(`Rolling summary:\n${pet.summary.runningSummary}`);
  }

  if (pet.consults.length > 0) {
    const rows = pet.consults
      .map((c) => `- ${c.createdAt.toISOString().slice(0, 10)}: ${c.aiSummary ?? c.question.slice(0, 160)}`)
      .join("\n");
    parts.push(`Recent consults:\n${rows}`);
  }

  return parts.join("\n\n");
}

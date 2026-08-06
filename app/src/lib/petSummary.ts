// Rolling per-pet summary. Called after a consult is saved so the next
// consult's pet context has an updated one-paragraph memory of what has
// been going on with this animal recently.
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { callAnthropicJson, OWNER_MODEL } from "@/lib/ai/anthropic";

const SUMMARY_SYSTEM_PROMPT = `You are Amia's pet-memory maintainer. Given a pet's static profile, its most recent consult summaries, and the current running summary (if any), return a fresh 1-paragraph running summary suitable for injection into the next consult's context.

Rules:
- Keep it under 120 words.
- Prefer specific facts over generalities (dates, weights, meds, chronic issues) but do not invent facts that aren't in the inputs.
- Fade older items; the newest consult is the most important.
- Plain prose, no bullets or headers.

Return one JSON object: { "summary": string } and nothing else.`;

const SummarySchema = z.object({ summary: z.string() });

export async function regeneratePetSummary(petId: string): Promise<void> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      summary: true,
      consults: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          createdAt: true,
          question: true,
          aiSummary: true,
        },
      },
    },
  });
  if (!pet) return;

  const lines: string[] = [];
  lines.push(
    `Pet: ${pet.name} (${pet.species}${pet.breed ? `, ${pet.breed}` : ""}${pet.weightLb ? `, ${pet.weightLb} lb` : ""})`
  );
  if (pet.conditions) lines.push(`Chronic conditions: ${pet.conditions}`);
  if (pet.medications) lines.push(`Medications: ${pet.medications}`);
  if (pet.allergies) lines.push(`Allergies: ${pet.allergies}`);
  if (pet.summary?.runningSummary) {
    lines.push(`\nPrevious running summary:\n${pet.summary.runningSummary}`);
  }
  if (pet.consults.length > 0) {
    lines.push("\nRecent consults (newest first):");
    for (const c of pet.consults) {
      lines.push(
        `- ${c.createdAt.toISOString().slice(0, 10)}: ${c.aiSummary ?? c.question.slice(0, 200)}`
      );
    }
  }

  const userPrompt = lines.join("\n");

  const { data } = await callAnthropicJson({
    model: OWNER_MODEL,
    systemPrompt: SUMMARY_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 400,
    schema: SummarySchema,
    kind: "pet_summary",
    consultId: null,
  });

  await prisma.petSummary.upsert({
    where: { petId },
    create: { petId, runningSummary: data.summary },
    update: { runningSummary: data.summary },
  });
}

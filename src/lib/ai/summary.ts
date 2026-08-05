// ============================================================
// Regenerate PetSummary.runningSummary after each consult so the injected
// history stays small and bounded. Best-effort: failures are swallowed so
// they never block the owner's answer.
// ============================================================
import { prisma } from "@/lib/prisma";
import { callModel, parseJsonObject } from "./anthropic";

const MAX_SUMMARY_CHARS = 1200;

const SUMMARY_SYSTEM = `You maintain a concise, factual running health summary for a single pet, used as background context for future questions. Keep it under ${MAX_SUMMARY_CHARS} characters. Include durable facts (chronic issues, recurring symptoms, notable past concerns, dates) and drop trivia. Do not give advice. Respond with a SINGLE JSON object: {"summary": "..."} and nothing else.`;

/**
 * Fold the latest consult into the pet's running summary. Called after an
 * answer is produced. Logs the call to AiLog with the consult id.
 */
export async function regeneratePetSummary(petId: string, consultId?: string): Promise<void> {
  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        summary: true,
        consults: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { messages: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!pet) return;

    const previous = pet.summary?.runningSummary?.trim() || "(none yet)";
    const latest = pet.consults[0];
    const transcript = latest
      ? latest.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
      : "(no messages)";

    const userContent = [
      `Existing running summary:\n${previous}`,
      `\nMost recent consult (${latest ? latest.createdAt.toISOString().slice(0, 10) : "n/a"}):\n${transcript}`,
      `\nProduce the updated running summary now.`,
    ].join("\n");

    const raw = await callModel({ system: SUMMARY_SYSTEM, userContent, maxTokens: 600 });

    await prisma.aiLog.create({
      data: { consultId: consultId ?? null, prompt: userContent, response: raw.response, model: raw.model },
    });

    const parsed = parseJsonObject<{ summary?: string }>(raw.response);
    const next = (parsed?.summary ?? "").slice(0, MAX_SUMMARY_CHARS);
    if (!next) return;

    await prisma.petSummary.upsert({
      where: { petId },
      create: { petId, runningSummary: next },
      update: { runningSummary: next },
    });
  } catch (err) {
    console.error("regeneratePetSummary failed (non-blocking):", err);
  }
}

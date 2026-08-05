// ============================================================
// History injection: build a COMPACT pet-context block from the pet
// profile + PetSummary.runningSummary + brief notes on recent consults.
// We never dump raw transcripts; we inject small, dated summaries so the
// token size stays bounded and the model can weigh recency.
// ============================================================
import { prisma } from "@/lib/prisma";

const RECENT_CONSULTS = 3;

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function buildPetContext(petId: string): Promise<string> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      summary: true,
      consults: {
        orderBy: { createdAt: "desc" },
        take: RECENT_CONSULTS,
        include: {
          messages: {
            where: { role: "ai" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!pet) return "PET CONTEXT: (none available)";

  const profileLines = [
    `Name: ${pet.name}`,
    `Species: ${pet.species}`,
    pet.breed ? `Breed: ${pet.breed}` : null,
    pet.sex ? `Sex: ${pet.sex}` : null,
    pet.birthdateOrAge ? `Age: ${pet.birthdateOrAge}` : null,
    pet.weightLbs != null ? `Weight: ${pet.weightLbs} lbs` : null,
    pet.notes ? `Owner notes: ${pet.notes}` : null,
  ].filter(Boolean);

  const running = pet.summary?.runningSummary?.trim();

  // One short dated line per recent consult, using the AI message's stored
  // summary metadata when available (falls back to urgency only).
  const recent = pet.consults
    .map((c) => {
      const meta = c.messages[0]?.metadata as { summary?: string } | null;
      const note = meta?.summary?.trim();
      return `- ${fmtDate(c.createdAt)} [${c.urgency}]${note ? `: ${note}` : ""}`;
    })
    .join("\n");

  return [
    "PET CONTEXT (weigh recency; ignore anything irrelevant to the current question):",
    profileLines.join("\n"),
    running ? `\nRunning history summary:\n${running}` : "",
    recent ? `\nRecent consults:\n${recent}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

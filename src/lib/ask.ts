// Resolve an AskDraft into a real pet + consult for a signed-in user.
import { prisma } from "@/lib/prisma";
import { createConsult } from "@/lib/consult";
import type { AskDraft } from "@/lib/draft";

/** Return the pet id for this draft, creating a new pet if needed. */
async function resolvePetId(userId: string, draft: AskDraft): Promise<string | null> {
  if (draft.petId) {
    const pet = await prisma.pet.findFirst({ where: { id: draft.petId, userId } });
    if (pet) return pet.id;
  }
  if (draft.newPet?.name && draft.newPet?.species) {
    const pet = await prisma.pet.create({
      data: {
        userId,
        name: draft.newPet.name,
        species: draft.newPet.species,
        breed: draft.newPet.breed || null,
        sex: draft.newPet.sex || null,
        birthdateOrAge: draft.newPet.birthdateOrAge || null,
        weightLbs: draft.newPet.weightLbs ?? null,
      },
    });
    return pet.id;
  }
  return null;
}

/** Turn a draft into a consult (creating the pet if necessary). */
export async function processDraft(userId: string, draft: AskDraft): Promise<string | null> {
  const petId = await resolvePetId(userId, draft);
  if (!petId) return null;
  return createConsult({ userId, petId, question: draft.question });
}

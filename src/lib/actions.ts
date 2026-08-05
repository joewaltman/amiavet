"use server";
// ============================================================
// Server actions (mutations). All run on the Node server.
// ============================================================
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUser } from "@/lib/auth-helpers";
import { encodeDraft, decodeDraft, DRAFT_COOKIE, type AskDraft } from "@/lib/draft";
import { processDraft } from "@/lib/ask";
import { addOwnerReply } from "@/lib/consult";

const RESUME_PATH = "/ask/resume";

/**
 * Public ask-box submission. If the user is not signed in, we sign the draft
 * into an httpOnly cookie and send them to log in; after auth they land on
 * /ask/resume which processes it. If already signed in, we process now.
 */
export async function startAsk(formData: FormData): Promise<void> {
  const question = String(formData.get("question") ?? "").trim();
  if (question.length < 5) redirect("/?error=short");

  const petId = String(formData.get("petId") ?? "");
  const newPetName = String(formData.get("newPetName") ?? "").trim();
  const newPetSpecies = String(formData.get("newPetSpecies") ?? "").trim();

  const draft: AskDraft = { question };
  if (petId && petId !== "__new__") {
    draft.petId = petId;
  } else if (newPetName && newPetSpecies) {
    draft.newPet = { name: newPetName, species: newPetSpecies };
  } else {
    redirect("/?error=pet");
  }

  const user = await getSessionUser();
  if (!user) {
    cookies().set(DRAFT_COOKIE, encodeDraft(draft), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30, // 30 minutes
    });
    redirect(`/login?next=${encodeURIComponent(RESUME_PATH)}`);
  }

  const consultId = await processDraft(user.id, draft);
  if (!consultId) redirect("/?error=pet");
  redirect(`/consult/${consultId}`);
}

/** Consume the draft cookie after login and process it. Returns consult id. */
export async function consumeDraft(): Promise<string | null> {
  const user = await requireUser();
  const token = cookies().get(DRAFT_COOKIE)?.value;
  const draft = decodeDraft(token);
  cookies().delete(DRAFT_COOKIE);
  if (!draft) return null;
  return processDraft(user.id, draft);
}

/** Owner replies to a follow-up (or adds detail) on their consult. */
export async function addReplyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const consultId = String(formData.get("consultId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!consultId || text.length < 1) return;

  const consult = await prisma.consult.findFirst({ where: { id: consultId, userId: user.id } });
  if (!consult) redirect("/dashboard");

  await addOwnerReply(consultId, text);
  revalidatePath(`/consult/${consultId}`);
}

/** Create a pet from the pets/new form. */
export async function createPetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const species = String(formData.get("species") ?? "").trim();
  if (!name || !species) redirect("/pets/new?error=1");

  const weightRaw = String(formData.get("weightLbs") ?? "").trim();
  const weightLbs = weightRaw ? Number(weightRaw) : null;

  await prisma.pet.create({
    data: {
      userId: user.id,
      name,
      species,
      breed: String(formData.get("breed") ?? "").trim() || null,
      sex: String(formData.get("sex") ?? "").trim() || null,
      birthdateOrAge: String(formData.get("birthdateOrAge") ?? "").trim() || null,
      weightLbs: Number.isFinite(weightLbs as number) ? weightLbs : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Update an existing pet (ownership enforced). */
export async function updatePetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const pet = await prisma.pet.findFirst({ where: { id, userId: user.id } });
  if (!pet) redirect("/dashboard");

  const weightRaw = String(formData.get("weightLbs") ?? "").trim();
  const weightLbs = weightRaw ? Number(weightRaw) : null;

  await prisma.pet.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? pet.name).trim() || pet.name,
      species: String(formData.get("species") ?? pet.species).trim() || pet.species,
      breed: String(formData.get("breed") ?? "").trim() || null,
      sex: String(formData.get("sex") ?? "").trim() || null,
      birthdateOrAge: String(formData.get("birthdateOrAge") ?? "").trim() || null,
      weightLbs: Number.isFinite(weightLbs as number) ? weightLbs : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath(`/pets/${id}`);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

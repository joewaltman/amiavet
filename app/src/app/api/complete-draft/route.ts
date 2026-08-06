// Completes a pre-auth session after the owner signs in.
//
// Two cookies may be waiting:
//   * amia_save_intent — full two-stage session already answered.
//     Delegate to /api/consults/complete-save.
//   * amia_draft (legacy) — just a question. Run triage → answer
//     inline and persist. Kept during the transition off the old
//     one-shot AskBox.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDraft, clearDraft, hasSaveIntent } from "@/lib/draft";
import { runTriage } from "@/lib/ai/triage";
import { runAnswer } from "@/lib/ai/answer";
import { persistSession } from "@/lib/consults";

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return redirectTo("/login");

  // New-flow cookie takes precedence.
  if (await hasSaveIntent()) {
    return redirectTo("/api/consults/complete-save");
  }

  const draft = await getDraft();
  if (!draft?.question) return redirectTo("/dashboard");

  // Legacy: convert a raw question into a full session on the fly. No
  // interactive follow-ups possible here, so we just let triage decide
  // and let the answer stage acknowledge any missing info.
  const petId = draft.petId ?? null;
  const triage = await runTriage({ questionText: draft.question, petId });
  const answer = await runAnswer({
    questionText: draft.question,
    petId,
    triage,
    followupAnswers: {},
  });
  const { consultId } = await persistSession({
    ownerId: userId,
    petId,
    questionText: draft.question,
    triage,
    followupAnswers: {},
    answer,
  });
  await clearDraft();

  return redirectTo(`/consults/${consultId}`);
}

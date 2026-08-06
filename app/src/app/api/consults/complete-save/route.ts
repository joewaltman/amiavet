// GET /api/consults/complete-save — replay a stashed save after login.
//
// The dashboard redirects here when it sees the amia_save_intent cookie.
// We validate, persist, clear the cookie, and redirect the browser to
// the consult page (or a checkout hint if the owner picked review/video).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSaveIntent, clearSaveIntent } from "@/lib/draft";
import { SaveRequestSchema } from "@/lib/ai/schemas";
import { persistSession } from "@/lib/consults";

// Same relative-Location pattern used by /api/complete-draft — Railway's
// internal proxy hostname is not the browser's origin.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return redirectTo("/login");

  const intent = await getSaveIntent();
  if (!intent) return redirectTo("/dashboard");

  let parsed;
  try {
    parsed = SaveRequestSchema.parse(intent);
  } catch (err) {
    console.warn("complete-save: bad intent cookie, clearing:", err);
    await clearSaveIntent();
    return redirectTo("/dashboard");
  }

  const { consultId } = await persistSession({
    ownerId: userId,
    petId: parsed.petId ?? null,
    questionText: parsed.questionText,
    triage: parsed.triage,
    followupAnswers: parsed.followupAnswers,
    answer: parsed.answer,
  });
  await clearSaveIntent();

  const nextPath =
    parsed.thenTo === "review" || parsed.thenTo === "video"
      ? `/consults/${consultId}?checkout=${parsed.thenTo}`
      : `/consults/${consultId}`;
  return redirectTo(nextPath);
}

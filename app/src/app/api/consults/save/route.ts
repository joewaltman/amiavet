// POST /api/consults/save — persist a completed two-stage session.
//
// Requires auth. If unauthenticated, we stash the full session in a
// signed cookie and return 401 { redirect: "/login" }. After sign-in
// the dashboard picks up the cookie and forwards to
// /api/consults/complete-save.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSaveIntent } from "@/lib/draft";
import { SaveRequestSchema } from "@/lib/ai/schemas";
import { persistSession } from "@/lib/consults";

export async function POST(req: Request) {
  let body;
  try {
    body = SaveRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    // Serialize the whole session and bounce to login.
    await setSaveIntent({
      petId: body.petId ?? null,
      questionText: body.questionText,
      triage: body.triage,
      followupAnswers: body.followupAnswers,
      answer: body.answer,
      thenTo: body.thenTo,
      createdAt: Date.now(),
    });
    return NextResponse.json(
      { redirect: "/login", reason: "auth_required" },
      { status: 401 }
    );
  }

  const { consultId } = await persistSession({
    ownerId: userId,
    petId: body.petId ?? null,
    questionText: body.questionText,
    triage: body.triage,
    followupAnswers: body.followupAnswers,
    answer: body.answer,
  });

  // The Stripe checkout for review/video takes { consultId, kind } — the
  // client can hit that directly, or land on the consult page. We just
  // return the ids and let the client route.
  return NextResponse.json({ consultId, next: nextPath(consultId, body.thenTo) });
}

function nextPath(
  consultId: string,
  thenTo: "dashboard" | "review" | "video"
): string {
  if (thenTo === "review" || thenTo === "video") {
    // Client can POST /api/stripe/checkout with { consultId, kind } to
    // get the Stripe URL; expose it here as a hint.
    return `/consults/${consultId}?checkout=${thenTo}`;
  }
  return `/consults/${consultId}`;
}

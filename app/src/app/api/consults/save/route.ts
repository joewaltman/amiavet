// POST /api/consults/save — persist a completed two-stage session.
//
// Now anonymous-safe: getActor() always yields an owner (guest or
// authed), so this always succeeds and returns { consultId, isGuest }.
// The client decides whether to nudge the guest to sign up before
// hitting a paid CTA.
import { NextResponse } from "next/server";
import { SaveRequestSchema } from "@/lib/ai/schemas";
import { persistSession } from "@/lib/consults";
import { getActor } from "@/lib/actor";

export async function POST(req: Request) {
  let body;
  try {
    body = SaveRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const actor = await getActor();

  const { consultId } = await persistSession({
    ownerId: actor.userId,
    petId: body.petId ?? null,
    questionText: body.questionText,
    triage: body.triage,
    followupAnswers: body.followupAnswers,
    answer: body.answer,
  });

  return NextResponse.json({ consultId, isGuest: actor.isGuest });
}

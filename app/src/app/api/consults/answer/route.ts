// POST /api/consults/answer — stage 2 of the two-stage flow.
//
// Uses the same anonymous-friendly actor model as /triage. Guests are
// rate-limited to freeGuestCap() completed answers per UTC day; the
// counter is incremented on success. Authed users are unlimited.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAnswer } from "@/lib/ai/answer";
import { AnswerRequestSchema } from "@/lib/ai/schemas";
import { getActor, actorDistinctId } from "@/lib/actor";
import {
  freeGuestCap,
  getGuestUsageToday,
  incrementGuestUsageToday,
} from "@/lib/rateLimit";
import { trackServer } from "@/lib/analytics-server";

export async function POST(req: Request) {
  let body;
  try {
    body = AnswerRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const actor = await getActor();
  const distinctId = actorDistinctId(actor);
  const sessionId = body.sessionId ?? "";

  // Enforce the free daily cap for guests before spending an AI call.
  if (actor.isGuest) {
    const limit = freeGuestCap();
    const used = await getGuestUsageToday(actor.userId);
    if (used >= limit) {
      trackServer(distinctId, "free_limit_hit", { limit });
      return NextResponse.json(
        { error: "free limit reached", code: "free_limit_hit", limit },
        { status: 429 }
      );
    }
  }

  let petId: string | null = body.petId ?? null;
  if (petId) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true },
    });
    if (!pet) petId = null;
    else if (pet.ownerId !== actor.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const answer = await runAnswer({
    questionText: body.questionText,
    petId,
    triage: body.triage,
    followupAnswers: body.followupAnswers,
  });

  // Only count against the cap once we actually returned a real answer.
  if (actor.isGuest) {
    await incrementGuestUsageToday(actor.userId);
  }

  if (sessionId) {
    trackServer(distinctId, "answer_generated", {
      sessionId,
      urgency: answer.urgency,
      isEmergency: !!answer.isEmergency,
    });
  }

  return NextResponse.json({ answer });
}

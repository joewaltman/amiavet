// POST /api/consults/triage — stage 1 of the two-stage flow.
//
// Never demands a session; getActor() materializes a guest User row on
// the first hit and sets the guest cookies. We use the actor identity
// as the PostHog distinct_id so every server event before sign-in is
// keyed by the same guestToken that the browser also uses.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runTriage } from "@/lib/ai/triage";
import { TriageRequestSchema } from "@/lib/ai/schemas";
import { getActor, actorDistinctId } from "@/lib/actor";
import { trackServer } from "@/lib/analytics-server";

export async function POST(req: Request) {
  let body;
  try {
    body = TriageRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const actor = await getActor();
  const distinctId = actorDistinctId(actor);
  const sessionId = body.sessionId ?? "";

  // Validate pet ownership against the actor's userId (works for both
  // guests and authed users). Drop the petId if it doesn't belong.
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

  if (sessionId) {
    trackServer(distinctId, "question_submitted", {
      sessionId,
      isGuest: actor.isGuest,
      petId,
    });
  }

  const triage = await runTriage({
    questionText: body.questionText,
    petId,
  });

  if (sessionId) {
    trackServer(distinctId, "triage_completed", {
      sessionId,
      decision: triage.decision,
      topic: triage.intake.chiefComplaint || null,
    });
  }

  return NextResponse.json(triage);
}

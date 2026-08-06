// POST /api/consults/answer — stage 2 of the two-stage flow.
//
// Same auth posture as /triage: anonymous-friendly, no DB writes. The
// client keeps the answer in memory and only persists it via /save.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runAnswer } from "@/lib/ai/answer";
import { AnswerRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  let body;
  try {
    body = AnswerRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  let petId: string | null = body.petId ?? null;
  if (petId) {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) {
      const pet = await prisma.pet.findUnique({
        where: { id: petId },
        select: { ownerId: true },
      });
      if (!pet) petId = null;
      else if (pet.ownerId !== userId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    } else {
      petId = null;
    }
  }

  const answer = await runAnswer({
    questionText: body.questionText,
    petId,
    triage: body.triage,
    followupAnswers: body.followupAnswers,
  });
  return NextResponse.json({ answer });
}

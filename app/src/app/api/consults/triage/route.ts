// POST /api/consults/triage — stage 1 of the two-stage flow.
//
// Anonymous-friendly: no auth required. If petId is provided and a user
// is signed in, we verify ownership; anon petId is silently dropped.
// Nothing is written to Consult/ConsultMessage at this stage.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runTriage } from "@/lib/ai/triage";
import { TriageRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  let body;
  try {
    body = TriageRequestSchema.parse(await req.json());
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
      // Anon caller with a petId — ignore it defensively.
      petId = null;
    }
  }

  const triage = await runTriage({
    questionText: body.questionText,
    petId,
  });
  return NextResponse.json(triage);
}

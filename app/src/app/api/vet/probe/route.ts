// POST /api/vet/probe
// Run a free-form probe against the AI on behalf of a reviewing vet.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVet } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { vetProbe } from "@/lib/ai/anthropic";
import { buildPetContext } from "@/lib/ai/petContext";

const Body = z.object({
  consultId: z.string().min(1),
  question: z.string().min(3).max(2000),
  priorAnswer: z.string().default(""),
});

export async function POST(req: Request) {
  const session = await requireVet();
  if (!session)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const vetId = (session.user as { id: string }).id;

  const consult = await prisma.consult.findUnique({
    where: { id: parsed.consultId },
  });
  if (!consult)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  // Ensure a VetReview row exists so we can attach the probe log to it.
  const review = await prisma.vetReview.upsert({
    where: { consultId: consult.id },
    update: {},
    create: {
      consultId: consult.id,
      vetId,
      verdict: "agree",
      feedback: "",
    },
  });

  const petContext = consult.petId
    ? await buildPetContext(consult.petId)
    : "";

  const answer = await vetProbe({
    vetReviewId: review.id,
    consultId: consult.id,
    question: parsed.question,
    petContext,
    priorAnswer: parsed.priorAnswer,
  });

  return NextResponse.json({ answer });
}

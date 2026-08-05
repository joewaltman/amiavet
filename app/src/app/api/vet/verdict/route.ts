// POST /api/vet/verdict
// Persist the vet's verdict + feedback + probe log, flip the consult status,
// and email the owner.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVet } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { sendVetReviewEmail } from "@/lib/email/resend";

const ProbeItem = z.object({
  q: z.string(),
  a: z.string(),
  at: z.string(),
});

const Body = z.object({
  consultId: z.string().min(1),
  verdict: z.enum(["agree", "clarify", "disagree"]),
  feedback: z.string().min(1).max(10000),
  aiProbeLog: z.array(ProbeItem).default([]),
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
    include: { owner: true },
  });
  if (!consult)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.vetReview.upsert({
    where: { consultId: consult.id },
    update: {
      verdict: parsed.verdict,
      feedback: parsed.feedback,
      aiProbeLog: parsed.aiProbeLog,
      vetId,
    },
    create: {
      consultId: consult.id,
      vetId,
      verdict: parsed.verdict,
      feedback: parsed.feedback,
      aiProbeLog: parsed.aiProbeLog,
    },
  });

  await prisma.consult.update({
    where: { id: consult.id },
    data: { status: "review_complete" },
  });

  // Best-effort email; don't fail the request if Resend isn't configured yet.
  try {
    await sendVetReviewEmail({
      to: consult.owner.email,
      consultId: consult.id,
      vetName: session.user?.name ?? "Your Amia vet",
      verdict: parsed.verdict,
      feedback: parsed.feedback,
    });
  } catch (err) {
    console.warn("Failed to send vet review email:", err);
  }

  return NextResponse.json({ ok: true });
}

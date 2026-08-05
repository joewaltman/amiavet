// POST /api/stripe/checkout
// Body: { consultId, kind: "review" | "video" }
// Returns: { url } — the Stripe Checkout session URL to redirect to.
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createConsultCheckout } from "@/lib/stripe";

const Body = z.object({
  consultId: z.string().min(1),
  kind: z.enum(["review", "video"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const consult = await prisma.consult.findUnique({
    where: { id: parsed.consultId },
  });
  if (!consult || consult.ownerId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const checkout = await createConsultCheckout({
    consultId: consult.id,
    kind: parsed.kind,
    ownerEmail: session.user.email!,
  });

  await prisma.payment.create({
    data: {
      consultId: consult.id,
      ownerId: userId,
      kind: parsed.kind,
      amountCents: parsed.kind === "review" ? 2000 : 4000,
      currency: "usd",
      status: "pending",
      stripeCheckoutSessionId: checkout.id,
    },
  });

  return NextResponse.json({ url: checkout.url });
}

// POST /api/stripe/webhook
// Stripe verifies the payload with the signing secret; on
// checkout.session.completed we flip the Payment + Consult state.
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { trackServer } from "@/lib/analytics-server";
import { generateAndStorePrepNote } from "@/lib/ai/prepNotePrompt";

// Stripe needs the raw body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(cs);
    } else if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      const cs = event.data.object as Stripe.Checkout.Session;
      await prisma.payment.updateMany({
        where: { stripeCheckoutSessionId: cs.id },
        data: { status: "failed" },
      });
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(cs: Stripe.Checkout.Session) {
  const payment = await prisma.payment.findUnique({
    where: { stripeCheckoutSessionId: cs.id },
  });
  if (!payment) {
    console.warn("No local Payment for checkout session", cs.id);
    return;
  }
  if (payment.status === "paid") return; // idempotent

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        stripePaymentIntentId:
          typeof cs.payment_intent === "string" ? cs.payment_intent : null,
      },
    });
    if (payment.kind === "review") {
      await tx.consult.update({
        where: { id: payment.consultId },
        data: { status: "review_requested" },
      });
    } else if (payment.kind === "video") {
      const bookingUrl =
        process.env.VIDEO_BOOKING_URL ?? "https://cal.com/amiavet";
      await tx.videoBooking.upsert({
        where: { consultId: payment.consultId },
        update: { bookingUrl },
        create: { consultId: payment.consultId, bookingUrl },
      });
      await tx.consult.update({
        where: { id: payment.consultId },
        data: { status: "video_booked" },
      });
    }
  });

  // Fire after the transaction commits so we never emit a
  // payment_succeeded for a payment we didn't actually mark paid.
  // Video payments also fire from the Cal.com webhook once the visit
  // is scheduled; both events carry the same consultId + tier so
  // funnel joins in PostHog still work.
  if (payment.kind === "review") {
    trackServer(payment.ownerId, "payment_succeeded", {
      consultId: payment.consultId,
      tier: "review",
      amountCents: payment.amountCents,
    });
    // Best-effort prep note so the vet queue shows context the moment
    // the review lands. Video visits generate/refresh it again from
    // the Cal.com webhook. Any failure is logged but must not fail the
    // webhook — Stripe will retry, which would re-process the payment.
    try {
      await generateAndStorePrepNote(payment.consultId);
    } catch (err) {
      console.warn("stripe webhook: prep-note generation failed:", err);
    }
  }
}

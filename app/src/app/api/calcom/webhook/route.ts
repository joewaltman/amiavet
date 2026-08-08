// POST /api/calcom/webhook — Cal.com booking-lifecycle events.
//
// We only listen for BOOKING_PAID today: emit payment_succeeded with
// tier=video and update VideoBooking.scheduledAt so the dashboard can
// show the scheduled time. The consultId is round-tripped via
// payload.metadata.consultId (see consults/[id]/page.tsx which appends
// ?metadata[consultId]= to the master booking URL).
//
// Payment rows themselves are still created by the Stripe checkout
// flow — this webhook does not touch the payments table, only reads it
// to look up ownerId for the PostHog distinct_id.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { trackServer } from "@/lib/analytics-server";
import { generateAndStorePrepNote } from "@/lib/ai/prepNotePrompt";
import { sendVetPrepNoteEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySig(secret: string, body: string, header: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) {
    // Explicitly return 501 so misconfigured deployments don't silently
    // 200-accept unsigned traffic.
    return NextResponse.json(
      { error: "webhook not configured" },
      { status: 501 }
    );
  }

  const sig = req.headers.get("x-cal-signature-256");
  const raw = await req.text();
  if (!sig || !verifySig(secret, raw, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: {
    triggerEvent?: string;
    payload?: {
      metadata?: { consultId?: string };
      startTime?: string;
      // Cal.com includes the assigned host under organizer for
      // round-robin bookings. We only use organizer.email to route the
      // notification; we do NOT rely on any other host field.
      organizer?: { email?: string; name?: string };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (event.triggerEvent !== "BOOKING_PAID") {
    // Silently accept — the webhook is subscribed at Cal.com level, we
    // just don't have a handler for other events yet.
    return NextResponse.json({ ok: true, ignored: event.triggerEvent });
  }

  const consultId = event.payload?.metadata?.consultId;
  if (!consultId) {
    return NextResponse.json({ error: "missing consultId" }, { status: 400 });
  }

  // Find the paid video Payment row for this consult so we can key the
  // PostHog event by the real owner (works whether the ownership was
  // set at Stripe time or later via claim-or-merge).
  const payment = await prisma.payment.findFirst({
    where: { consultId, kind: "video", status: "paid" },
    select: { id: true, ownerId: true, amountCents: true },
  });

  if (!payment) {
    // Booking arrived before Stripe caught up — refuse loudly so
    // Cal.com will retry.
    return NextResponse.json(
      { error: "no paid video payment for consult" },
      { status: 404 }
    );
  }

  const startTime = event.payload?.startTime
    ? new Date(event.payload.startTime)
    : null;
  if (startTime && !Number.isNaN(startTime.getTime())) {
    await prisma.videoBooking.updateMany({
      where: { consultId },
      data: { scheduledAt: startTime },
    });
  }

  trackServer(payment.ownerId, "payment_succeeded", {
    consultId,
    tier: "video",
    amountCents: payment.amountCents,
  });

  // Generate the prep note + notify the vet. Both steps are best-effort:
  // a failure here must not cause Cal.com to retry the booking-paid
  // event, since the payment + scheduledAt state above is already
  // committed and any retry would double-track and double-email.
  try {
    await notifyVetOfVideoBooking({
      consultId,
      scheduledAt: startTime && !Number.isNaN(startTime.getTime()) ? startTime : null,
      organizerEmail: event.payload?.organizer?.email ?? null,
    });
  } catch (err) {
    console.warn("cal.com webhook: prep-note / vet email failed:", err);
  }

  return NextResponse.json({ ok: true });
}

// Resolve the vet recipient, refresh the prep note, and send the email.
// Recipient rules:
//   1. If Cal.com passes an organizer email that matches a User with
//      role=vet, send to that vet.
//   2. Otherwise fall back to the VET_NOTIFICATION_EMAIL pool address.
//   3. If neither is configured, skip the email but still generate the
//      prep note (it's visible on the vet dashboard).
async function notifyVetOfVideoBooking(opts: {
  consultId: string;
  scheduledAt: Date | null;
  organizerEmail: string | null;
}) {
  const prepNote = await generateAndStorePrepNote(opts.consultId);

  const consult = await prisma.consult.findUnique({
    where: { id: opts.consultId },
    include: { pet: true },
  });
  if (!consult) return;

  let recipient: string | null = null;
  if (opts.organizerEmail) {
    const vet = await prisma.user.findFirst({
      where: { email: opts.organizerEmail, role: { in: ["vet", "admin"] } },
      select: { email: true },
    });
    if (vet?.email) recipient = vet.email;
  }
  if (!recipient) {
    recipient = process.env.VET_NOTIFICATION_EMAIL ?? null;
  }
  if (!recipient) {
    console.warn(
      "cal.com webhook: no vet recipient (no matching organizer, no VET_NOTIFICATION_EMAIL)"
    );
    return;
  }

  const petLabel = consult.pet
    ? `${consult.pet.name} (${consult.pet.species}${
        consult.pet.birthDate
          ? `, born ${consult.pet.birthDate.toISOString().slice(0, 10)}`
          : ""
      })`
    : "no pet on file";

  await sendVetPrepNoteEmail({
    to: recipient,
    consultId: opts.consultId,
    scheduledAt: opts.scheduledAt,
    petLabel,
    ownerQuestion: consult.question,
    prepNote,
    urgency: consult.urgency,
  });
}

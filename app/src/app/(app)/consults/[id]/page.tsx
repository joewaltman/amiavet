import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestReviewButton } from "@/components/request-review-button";
import { BookVideoButton } from "@/components/book-video-button";

export default async function ConsultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const role = (session!.user as { role?: string }).role ?? "owner";

  const consult = await prisma.consult.findUnique({
    where: { id },
    include: {
      pet: true,
      vetReview: { include: { vet: true } },
      payments: true,
      videoBooking: true,
    },
  });
  if (!consult) notFound();
  // Owner can see their own; vets can see any.
  if (consult.ownerId !== userId && role !== "vet" && role !== "admin") {
    redirect("/dashboard");
  }

  const paidReview = consult.payments.some(
    (p) => p.kind === "review" && p.status === "paid"
  );
  const paidVideo = consult.payments.some(
    (p) => p.kind === "video" && p.status === "paid"
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-sage underline">
          ← Back to dashboard
        </Link>
      </div>

      {consult.emergencyFlag ? (
        <div className="rounded-lg border-2 border-terracotta bg-orange-50 p-4 text-terracotta">
          <div className="font-semibold">Possible emergency</div>
          <p className="text-sm text-orange-900">
            Based on what you described, please seek immediate in-person
            veterinary care. Do not wait for a review here.
          </p>
        </div>
      ) : null}

      <section className="card">
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          Your question · {consult.pet?.name ?? "no pet selected"} ·{" "}
          {consult.createdAt.toLocaleString()}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-ink">{consult.question}</p>
      </section>

      <section className="card">
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          Amia AI answer
          {consult.aiUrgency ? ` · ${consult.aiUrgency}` : ""}
        </div>
        {consult.aiAnswer ? (
          <div className="prose prose-neutral mt-2 max-w-none whitespace-pre-wrap text-ink">
            {consult.aiAnswer}
          </div>
        ) : (
          <p className="mt-2 text-neutral-600">
            We couldn't reach the AI. Try asking again from your dashboard, or
            request a vet review below.
          </p>
        )}
      </section>

      <section className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-ink">
              {paidReview ? "Vet review" : "Want a vet to review this?"}
            </div>
            <p className="text-sm text-neutral-600">
              {paidReview
                ? consult.vetReview
                  ? `Verdict: ${consult.vetReview.verdict} — reviewed by ${
                      consult.vetReview.vet.name ?? consult.vetReview.vet.email
                    }`
                  : "In queue for a licensed vet."
                : "$20 — a licensed vet reads your question and the AI's answer, then agrees, clarifies, or corrects it."}
            </p>
          </div>
          {!paidReview ? <RequestReviewButton consultId={consult.id} /> : null}
        </div>
        {consult.vetReview?.feedback ? (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="font-semibold">Vet notes</div>
            <div className="mt-1 whitespace-pre-wrap">
              {consult.vetReview.feedback}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-ink">
              {paidVideo ? "Video visit" : "Prefer to talk it through?"}
            </div>
            <p className="text-sm text-neutral-600">
              {paidVideo && consult.videoBooking
                ? "Booked. See the link below to schedule."
                : "$40 — a 15-minute video visit with a licensed vet."}
            </p>
          </div>
          {!paidVideo ? <BookVideoButton consultId={consult.id} /> : null}
        </div>
        {consult.videoBooking ? (
          <div className="mt-4 text-sm">
            <a
              className="text-sage underline"
              href={consult.videoBooking.bookingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Schedule your video visit →
            </a>
          </div>
        ) : null}
      </section>

      <p className="text-xs text-neutral-500">
        Amia's AI-drafted answers are reviewed by licensed vets on request.
        This is not a substitute for in-person care.
      </p>
    </div>
  );
}

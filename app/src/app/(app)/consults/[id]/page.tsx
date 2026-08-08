import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestReviewButton } from "@/components/request-review-button";
import { BookVideoButton } from "@/components/book-video-button";
import { AnswerCard } from "@/components/answer-card";
import {
  AnswerResultSchema,
  type AnswerResult,
  type TriageResult,
  TriageResultSchema,
} from "@/lib/ai/schemas";

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
      messages: { orderBy: { createdAt: "asc" } },
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

  // Pull structured metadata from ConsultMessage rows. Fall back to the
  // legacy plain-text aiAnswer if this consult predates ConsultMessage.
  const aiMessage = [...consult.messages]
    .reverse()
    .find((m) => m.role === "ai");
  const triageMessage = consult.messages.find((m) => m.role === "system");

  let structuredAnswer: AnswerResult | null = null;
  if (aiMessage?.metadata) {
    const parsed = AnswerResultSchema.safeParse(aiMessage.metadata);
    if (parsed.success) structuredAnswer = parsed.data;
  }

  let triage: TriageResult | null = null;
  if (triageMessage?.metadata) {
    // Rebuild a partial TriageResult from what we stored.
    const meta = triageMessage.metadata as Record<string, unknown>;
    const attempt = TriageResultSchema.safeParse({
      intake: meta.intake,
      decision: meta.decision,
      followups: meta.followups ?? [],
      emergencyReason: meta.emergencyReason ?? null,
    });
    if (attempt.success) triage = attempt.data;
  }

  const followupAnswers =
    (triageMessage?.metadata as Record<string, unknown> | null)?.followupAnswers ??
    null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-sage underline">
          ← Back to dashboard
        </Link>
      </div>

      <section className="card">
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          Your question · {consult.pet?.name ?? "no pet selected"} ·{" "}
          {consult.createdAt.toLocaleString()}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-ink">{consult.question}</p>
      </section>

      {triage && triage.followups.length > 0 ? (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Follow-up questions ({triage.followups.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {triage.followups.map((f) => {
              const raw = (followupAnswers as Record<string, unknown> | null)?.[
                f.id
              ];
              const shown =
                raw === null || raw === undefined
                  ? "(skipped)"
                  : Array.isArray(raw)
                    ? raw.join(", ")
                    : String(raw);
              return (
                <li key={f.id}>
                  <div className="text-neutral-600">{f.question}</div>
                  <div className="text-ink">{shown}</div>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}

      {structuredAnswer ? (
        <AnswerCard answer={structuredAnswer} />
      ) : consult.aiAnswer ? (
        <section className="card">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Amia AI answer
            {consult.urgency ? ` · ${consult.urgency}` : ""}
          </div>
          <div className="prose prose-neutral mt-2 max-w-none whitespace-pre-wrap text-ink">
            {consult.aiAnswer}
          </div>
        </section>
      ) : (
        <section className="card">
          <p className="text-neutral-600">
            We couldn't reach the AI. Try asking again from your dashboard, or
            request a vet review below.
          </p>
        </section>
      )}

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
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-neutral-600">
              This is a 15-minute visit focused on the question you submitted.
              Your vet can help you book more time if needed.
            </p>
            <a
              className="text-sage underline"
              href={appendConsultMetadata(
                consult.videoBooking.bookingUrl,
                consult.id
              )}
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

// Cal.com passes booking metadata through as query params of the form
// metadata[key]=value; the value round-trips back to us in the
// BOOKING_PAID webhook payload's payload.metadata.consultId so we can
// look up the right consult.
function appendConsultMetadata(url: string, consultId: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}metadata[consultId]=${encodeURIComponent(consultId)}`;
}

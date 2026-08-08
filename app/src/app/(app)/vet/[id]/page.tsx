import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireVet } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { buildPetContext } from "@/lib/ai/petContext";
import { VetReviewForm } from "@/components/vet-review-form";

// Full-context view for the vet. Shows the question, AI answer, pet profile,
// running summary, prior consult summaries, and the review + probe tools.
export default async function VetConsultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireVet();
  if (!session) redirect("/dashboard");
  const { id } = await params;

  const consult = await prisma.consult.findUnique({
    where: { id },
    include: {
      pet: true,
      owner: true,
      vetReview: true,
      videoBooking: true,
      aiLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!consult) notFound();

  const petContext = consult.petId
    ? await buildPetContext(consult.petId)
    : "No pet on file.";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/vet" className="text-sm text-sage underline">
          ← Back to queue
        </Link>
      </div>

      {consult.videoBooking ? (
        <section className="card border-l-4 border-sage">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Scheduled video visit
          </div>
          <div className="mt-1 text-ink">
            {consult.videoBooking.scheduledAt
              ? consult.videoBooking.scheduledAt.toLocaleString()
              : "Awaiting scheduled time"}
          </div>
          {consult.videoBooking.bookingUrl ? (
            <a
              className="mt-2 inline-block text-sm text-sage underline"
              href={consult.videoBooking.bookingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open join link →
            </a>
          ) : null}
        </section>
      ) : null}

      {consult.vetPrepNote ? (
        <section className="card bg-amber-50">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Prep note
            </div>
            {consult.vetPrepNoteAt ? (
              <div className="text-xs text-neutral-500">
                Generated {consult.vetPrepNoteAt.toLocaleString()}
              </div>
            ) : null}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-ink">
            {consult.vetPrepNote}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Owner · {consult.owner.email}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-ink">
            {consult.question}
          </div>
        </section>

        <section className="card">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            AI answer{consult.urgency ? ` · ${consult.urgency}` : ""}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-ink">
            {consult.aiAnswer ?? "(no AI answer captured)"}
          </div>
        </section>

        <section className="card lg:col-span-2">
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Pet context
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-ink">
            {petContext}
          </pre>
        </section>
      </div>

      <VetReviewForm
        consultId={consult.id}
        priorAnswer={consult.aiAnswer ?? ""}
        existing={consult.vetReview}
      />
    </div>
  );
}

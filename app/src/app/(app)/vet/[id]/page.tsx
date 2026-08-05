import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireVet } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { buildPetContext } from "@/lib/ai/history";
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
            AI answer{consult.aiUrgency ? ` · ${consult.aiUrgency}` : ""}
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

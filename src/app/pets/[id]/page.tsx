import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { updatePetAction } from "@/lib/actions";
import { PetForm } from "@/components/PetForm";
import { UrgencyBadge } from "@/components/UrgencyBadge";

export const dynamic = "force-dynamic";

export default async function PetPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const pet = await prisma.pet.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      summary: true,
      consults: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!pet) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-extrabold">{pet.name}</h1>

      <PetForm action={updatePetAction} pet={pet} submitLabel="Save changes" />

      {pet.summary?.runningSummary && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">History summary</h2>
          <p className="card whitespace-pre-wrap text-sm text-muted">{pet.summary.runningSummary}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Past questions</h2>
        {pet.consults.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {pet.consults.map((c) => (
              <li key={c.id}>
                <Link href={`/consult/${c.id}`} className="flex items-center justify-between rounded-xl border border-hairline bg-white px-4 py-3 text-sm hover:shadow-soft">
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  <UrgencyBadge urgency={c.urgency} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UrgencyBadge } from "@/components/UrgencyBadge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ai_answered: "AI answered",
  review_requested: "Vet review requested",
  reviewed: "Vet reviewed",
  video_booked: "Video visit booked",
  closed: "Closed",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const [pets, consults] = await Promise.all([
    prisma.pet.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.consult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        pet: { select: { name: true } },
        messages: { where: { role: "owner" }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Your dashboard</h1>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <Link href="/" className="btn">
          Ask a new question
        </Link>
      </div>

      {/* Pets */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your pets</h2>
          <Link href="/pets/new" className="text-sm font-semibold text-sage-dark hover:underline">
            + Add a pet
          </Link>
        </div>
        {pets.length === 0 ? (
          <p className="card text-sm text-muted">No pets yet. Add one to get started.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((p) => (
              <Link key={p.id} href={`/pets/${p.id}`} className="card transition hover:shadow-card">
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-muted">
                  {[p.species, p.breed, p.birthdateOrAge].filter(Boolean).join(" • ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Consults */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Recent questions</h2>
        {consults.length === 0 ? (
          <p className="card text-sm text-muted">No questions yet.</p>
        ) : (
          <ul className="space-y-3">
            {consults.map((c) => (
              <li key={c.id}>
                <Link href={`/consult/${c.id}`} className="card flex items-center justify-between gap-4 transition hover:shadow-card">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.messages[0]?.content ?? "Consult"}</p>
                    <p className="text-xs text-muted">
                      {c.pet.name} • {new Date(c.createdAt).toLocaleDateString()} • {STATUS_LABEL[c.status] ?? c.status}
                    </p>
                  </div>
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

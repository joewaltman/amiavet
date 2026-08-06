import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDraft, hasSaveIntent } from "@/lib/draft";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  // Post-login replay of a stashed two-stage session takes precedence.
  if (await hasSaveIntent()) {
    redirect("/api/consults/complete-save");
  }
  // Legacy: a bare-question draft from the pre-two-stage AskBox.
  const draft = await getDraft();
  if (draft?.question) {
    redirect("/api/complete-draft");
  }

  const [pets, consults] = await Promise.all([
    prisma.pet.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } }),
    prisma.consult.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { pet: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Your pets</h1>
          <Link href="/pets/new" className="btn">
            Add a pet
          </Link>
        </div>
        {pets.length === 0 ? (
          <div className="card mt-4 text-neutral-700">
            No pets yet. <Link className="text-sage underline" href="/pets/new">Add one</Link> so
            vet reviews have context.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {pets.map((p) => (
              <li key={p.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink">{p.name}</div>
                  <div className="text-sm text-neutral-600">
                    {p.species} · {p.breed ?? "unknown breed"}
                  </div>
                </div>
                <Link
                  href={`/pets/${p.id}`}
                  className="text-sm text-sage underline"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">Recent consults</h2>
        {consults.length === 0 ? (
          <div className="card mt-3 text-neutral-700">
            No consults yet. Ask a question from the <Link href="/" className="text-sage underline">home page</Link>.
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {consults.map((c) => (
              <li key={c.id} className="card">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/consults/${c.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {c.question.length > 90
                      ? c.question.slice(0, 90) + "..."
                      : c.question}
                  </Link>
                  <span className="text-xs uppercase tracking-wide text-neutral-500">
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {c.pet?.name ?? "No pet"} · {c.createdAt.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

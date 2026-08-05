import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Minimal admin view: counts + last 10 consults + last 10 payments.
export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/dashboard");

  const [users, pets, consults, payments, recentConsults, recentPayments] =
    await Promise.all([
      prisma.user.count(),
      prisma.pet.count(),
      prisma.consult.count(),
      prisma.payment.count({ where: { status: "paid" } }),
      prisma.consult.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { owner: true, pet: true },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { consult: true },
      }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Admin</h1>

      <section className="grid gap-4 sm:grid-cols-4">
        <Metric label="Users" value={users} />
        <Metric label="Pets" value={pets} />
        <Metric label="Consults" value={consults} />
        <Metric label="Paid" value={payments} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Recent consults</h2>
        <ul className="mt-2 space-y-2">
          {recentConsults.map((c) => (
            <li key={c.id} className="card">
              <div className="text-sm">
                <span className="font-semibold">{c.owner.email}</span> · {c.pet?.name ?? "no pet"} ·{" "}
                <span className="text-neutral-500">{c.status}</span>
              </div>
              <div className="text-xs text-neutral-500">
                {c.createdAt.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-ink">
                {c.question.slice(0, 200)}
                {c.question.length > 200 ? "..." : ""}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Recent payments</h2>
        <ul className="mt-2 space-y-2">
          {recentPayments.map((p) => (
            <li key={p.id} className="card text-sm">
              <span className="font-semibold">${(p.amountCents / 100).toFixed(2)}</span> · {p.kind} ·{" "}
              <span className="text-neutral-500">{p.status}</span> ·{" "}
              {p.createdAt.toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

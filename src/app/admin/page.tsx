import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Minimal admin view (phase 7 expands this).
export default async function AdminPage() {
  await requireAdmin();
  const [users, pets, consults, aiLogs] = await Promise.all([
    prisma.user.count(),
    prisma.pet.count(),
    prisma.consult.count(),
    prisma.aiLog.count(),
  ]);

  const stats = [
    { label: "Users", value: users },
    { label: "Pets", value: pets },
    { label: "Consults", value: consults },
    { label: "AI log entries", value: aiLogs },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-3xl font-extrabold text-sage">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { requireVet } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Placeholder vet dashboard. Role-gated now (phase 1 requirement); the full
// queue + AI-probe + feedback tools are built in phase 5.
export default async function VetHomePage() {
  const user = await requireVet();
  const pending = await prisma.consult.count({ where: { status: "review_requested" } });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-extrabold">Vet dashboard</h1>
      <p className="mt-1 text-sm text-muted">Signed in as {user.email} (role: {user.role})</p>

      <div className="card mt-6">
        <p className="text-sm text-muted">
          {pending} consult{pending === 1 ? "" : "s"} awaiting review.
        </p>
        <p className="mt-3 text-sm">
          The full review queue, the AI-probe tool, and the feedback + verdict form arrive in the next phase. Reviews
          and video visits are performed only by California-licensed veterinarians, and follow CA AB 1399 for any video
          visit (a VCPR may be established by video; no controlled substances or antimicrobials prescribed remotely).
        </p>
      </div>
    </div>
  );
}

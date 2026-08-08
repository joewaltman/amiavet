import Link from "next/link";
import { redirect } from "next/navigation";
import { requireVet } from "@/lib/roles";
import { prisma } from "@/lib/db";

// Queue: any consult that has been paid for review, plus recent ones.
export default async function VetQueuePage() {
  const session = await requireVet();
  if (!session) redirect("/dashboard");

  const queue = await prisma.consult.findMany({
    where: { status: { in: ["review_requested"] } },
    include: { pet: true, owner: true, vetReview: true },
    orderBy: { createdAt: "asc" },
  });
  const recent = await prisma.consult.findMany({
    where: { status: { in: ["review_complete", "video_booked", "closed"] } },
    include: { pet: true, owner: true, vetReview: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  // Upcoming video visits: any VideoBooking with a scheduledAt in the
  // future (or unscheduled, i.e. paid but Cal.com hasn't confirmed the
  // slot yet). Sorted so unscheduled bookings fall to the bottom.
  const now = new Date();
  const upcomingVideos = await prisma.videoBooking.findMany({
    where: {
      OR: [{ scheduledAt: null }, { scheduledAt: { gte: now } }],
    },
    include: {
      consult: { include: { pet: true, owner: true } },
    },
    orderBy: [{ scheduledAt: "asc" }],
    take: 20,
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Review queue</h1>
        <p className="text-sm text-neutral-600">
          Consults with a paid vet review waiting for you.
        </p>
        {queue.length === 0 ? (
          <div className="card mt-4 text-neutral-700">Nothing in the queue.</div>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.map((c) => (
              <li key={c.id} className="card">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/vet/${c.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {c.pet?.name ?? "no pet"} — {c.question.slice(0, 90)}
                    {c.question.length > 90 ? "..." : ""}
                  </Link>
                  {c.emergencyFlag ? (
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-terracotta">
                      Emergency flag
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {c.owner.email} · asked {c.createdAt.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">
          Upcoming video visits
        </h2>
        <p className="text-sm text-neutral-600">
          Paid video visits waiting for you. Open the case to see the prep
          note before the call.
        </p>
        {upcomingVideos.length === 0 ? (
          <div className="card mt-3 text-neutral-700">Nothing scheduled.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcomingVideos.map((v) => (
              <li key={v.id} className="card">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/vet/${v.consult.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {v.consult.pet?.name ?? "no pet"} —{" "}
                    {v.consult.question.slice(0, 80)}
                    {v.consult.question.length > 80 ? "..." : ""}
                  </Link>
                  {v.consult.emergencyFlag ? (
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-terracotta">
                      Emergency flag
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {v.scheduledAt
                    ? v.scheduledAt.toLocaleString()
                    : "Awaiting scheduled time"}{" "}
                  · {v.consult.owner.email}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">Recently reviewed</h2>
        {recent.length === 0 ? (
          <div className="card mt-3 text-neutral-700">No history yet.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((c) => (
              <li key={c.id} className="card">
                <Link
                  href={`/vet/${c.id}`}
                  className="text-ink hover:underline"
                >
                  {c.pet?.name ?? "no pet"} — {c.question.slice(0, 70)}
                  {c.question.length > 70 ? "..." : ""}
                </Link>
                <div className="text-xs text-neutral-500">
                  {c.status.replace(/_/g, " ")} · {c.updatedAt.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

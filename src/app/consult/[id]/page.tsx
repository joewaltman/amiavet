import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { addReplyAction } from "@/lib/actions";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { AiMessageView, type AiMessageMeta } from "@/components/AiMessageView";

export const dynamic = "force-dynamic";

export default async function ConsultPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const consult = await prisma.consult.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      pet: true,
      messages: { orderBy: { createdAt: "asc" } },
      review: true,
    },
  });
  if (!consult) notFound();

  const lastAi = [...consult.messages].reverse().find((m) => m.role === "ai");
  const lastAiMeta = (lastAi?.metadata ?? null) as AiMessageMeta | null;
  const awaitingFollowup = lastAiMeta?.type === "followup";
  const hasAnswer = consult.messages.some(
    (m) => m.role === "ai" && (m.metadata as AiMessageMeta | null)?.type === "answer",
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Consult about {consult.pet.name}</h1>
          <p className="text-sm text-muted">{new Date(consult.createdAt).toLocaleString()}</p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-sage-dark hover:underline">
          Dashboard
        </Link>
      </div>

      {/* Thread */}
      <div className="space-y-4">
        {consult.messages.map((m) => {
          if (m.role === "owner") {
            return (
              <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl bg-sage px-4 py-3 text-white shadow-soft">
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            );
          }
          if (m.role === "vet") {
            return (
              <div key={m.id} className="card border-sage/30">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sage-dark">Veterinarian</p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            );
          }
          // AI message
          return (
            <div key={m.id} className="card">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Amia (AI)</p>
              <AiMessageView meta={m.metadata as AiMessageMeta | null} fallback={m.content} />
            </div>
          );
        })}
      </div>

      {/* Reply / answer follow-up */}
      <form action={addReplyAction} className="mt-6 space-y-3">
        <input type="hidden" name="consultId" value={consult.id} />
        <label className="label" htmlFor="text">
          {awaitingFollowup ? "Answer Amia's questions" : "Add more detail or ask a follow-up"}
        </label>
        <textarea id="text" name="text" rows={3} required className="field resize-y" />
        <button type="submit" className="btn">
          Send to Amia
        </button>
      </form>

      {/* AI disclaimer near the answer */}
      {hasAnswer && (
        <div className="mt-6">
          <AiDisclaimer />
        </div>
      )}

      {/* Vet review CTA — Stripe checkout is wired in phase 4 (payments). */}
      {hasAnswer && (
        <div className="mt-6 rounded-2xl border border-sage/30 bg-sage-soft p-5">
          <h3 className="font-bold text-sage-dark">Want a professional opinion?</h3>
          <p className="mt-1 text-sm text-muted">
            A California-licensed veterinarian can review this answer for <strong>$20</strong>, or meet you on a
            15-minute video visit for <strong>$40</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn" disabled title="Checkout is enabled in the next phase">
              Have a vet review this — $20
            </button>
            <button type="button" className="btn-outline" disabled title="Checkout is enabled in the next phase">
              Book a video visit — $40
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Payments (Stripe) are added in the next phase.</p>
        </div>
      )}
    </div>
  );
}

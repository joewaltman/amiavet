// Presentational component for a structured AnswerResult. Shared between
// the client AskFlow (fresh answer, no persistence yet) and the consult
// detail page (persisted answer, replayed from ConsultMessage.metadata).
import type { AnswerResult } from "@/lib/ai/schemas";

const URGENCY_LABEL: Record<AnswerResult["urgency"], string> = {
  info: "Informational",
  monitor: "Monitor at home",
  see_vet: "See a vet",
  urgent: "Urgent",
};

const URGENCY_CLASS: Record<AnswerResult["urgency"], string> = {
  info: "bg-[color:var(--green-soft)] text-[color:var(--green-dark)] border-[color:var(--green-soft)]",
  monitor:
    "bg-[color:var(--green-soft)] text-[color:var(--green-dark)] border-[color:var(--green-soft)]",
  see_vet:
    "bg-[color:var(--terracotta-soft)] text-[color:var(--terracotta)] border-[color:var(--terracotta-soft)]",
  urgent:
    "bg-[color:var(--terracotta)] text-white border-[color:var(--terracotta)]",
};

export function AnswerCard({ answer }: { answer: AnswerResult }) {
  return (
    <div className="space-y-4">
      {answer.isEmergency ? (
        <div className="rounded-lg border-2 border-terracotta bg-orange-50 p-4 text-terracotta">
          <div className="font-semibold">This looks like an emergency.</div>
          <p className="text-sm text-orange-900">
            Please get to a clinic or ER now. Do not wait for a review here.
          </p>
        </div>
      ) : null}

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <span className={`pill ${URGENCY_CLASS[answer.urgency]}`}>
            {URGENCY_LABEL[answer.urgency]}
          </span>
        </div>

        {answer.summary ? (
          <p className="whitespace-pre-wrap text-ink">{answer.summary}</p>
        ) : null}

        {answer.watchFor.length > 0 ? (
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Watch for
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
              {answer.watchFor.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {!answer.isEmergency && answer.atHome.length > 0 ? (
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              At home
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
              {answer.atHome.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {answer.whenToSeeVet ? (
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              When to see a vet
            </div>
            <p className="mt-1 text-ink">{answer.whenToSeeVet}</p>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-neutral-500">
        AI-generated, informational only, not veterinary advice, and does not
        create a veterinarian-client-patient relationship.
      </p>
    </div>
  );
}

import type { Urgency } from "@prisma/client";
import { UrgencyBadge } from "@/components/UrgencyBadge";

// Shape stored in ConsultMessage.metadata for AI messages.
export interface AiMessageMeta {
  type?: "followup" | "answer";
  urgency?: Urgency;
  emergency?: boolean;
  followupQuestions?: string[] | null;
  answer?: {
    emergencyNotice: string | null;
    whatThisMightMean: string;
    whatToWatchFor: string;
    atHome: string;
    urgencyRead: string;
  } | null;
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h4>
      <p className="mt-1 whitespace-pre-wrap text-charcoal">{body}</p>
    </div>
  );
}

// Renders an AI message either as a structured answer or as follow-up questions.
// Falls back to raw content if metadata is missing/malformed.
export function AiMessageView({ meta, fallback }: { meta: AiMessageMeta | null; fallback: string }) {
  if (!meta || !meta.type) {
    return <p className="whitespace-pre-wrap">{fallback}</p>;
  }

  if (meta.type === "followup") {
    return (
      <div className="space-y-2">
        <p className="font-medium">A couple of quick questions so I can help:</p>
        <ul className="list-disc space-y-1 pl-5">
          {(meta.followupQuestions ?? []).map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>
    );
  }

  const a = meta.answer;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {meta.urgency && <UrgencyBadge urgency={meta.urgency} />}
      </div>
      {a?.emergencyNotice && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-semibold text-red-800">
          ⚠️ {a.emergencyNotice}
        </p>
      )}
      {a && (
        <div className="space-y-4">
          <Section title="What this might mean" body={a.whatThisMightMean} />
          <Section title="What to watch for" body={a.whatToWatchFor} />
          <Section title="What you can safely do at home" body={a.atHome} />
          <Section title="Urgency read" body={a.urgencyRead} />
        </div>
      )}
    </div>
  );
}

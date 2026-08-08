// Server-only Resend client + transactional email helpers.
import "server-only";
import { Resend } from "resend";

let _client: Resend | null = null;
function client() {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  _client = new Resend(key);
  return _client;
}

function fromAddress() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL not set");
  return from;
}

// Absolute-URL helper. Same fallback ordering as lib/stripe.ts, but
// resend.ts is imported from webhooks that don't already pull stripe
// in, so we inline the two-line version to avoid the transitive dep.
function absoluteUrl(path: string): string {
  const base =
    process.env.AUTH_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000");
  return new URL(path, base).toString();
}

// Vet gets this when a video visit is booked. Summary + link, not a
// full dump — the case page behind the link is the source of truth.
// `to` is the assigned vet's address if we can route it, otherwise the
// VET_NOTIFICATION_EMAIL pool.
export async function sendVetPrepNoteEmail(opts: {
  to: string;
  consultId: string;
  scheduledAt: Date | null;
  petLabel: string; // e.g. "Bandit (dog, ~5y)"
  ownerQuestion: string;
  prepNote: string;
  urgency: string | null;
}) {
  const url = absoluteUrl(`/vet/${opts.consultId}`);
  const when = opts.scheduledAt
    ? opts.scheduledAt.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "time TBD";
  const urgencyLine = opts.urgency
    ? `AI-flagged urgency: ${opts.urgency}\n`
    : "";
  const subject = `Video visit booked — ${opts.petLabel} · ${when}`;
  const text = `A video visit was just booked.

When: ${when}
Pet:  ${opts.petLabel}
${urgencyLine}
Owner's question:
${opts.ownerQuestion.trim()}

Prep note:
${opts.prepNote.trim()}

Open the full case (sign-in required):
${url}

— Amia Vet`;
  return client().emails.send({
    from: fromAddress(),
    to: opts.to,
    subject,
    text,
  });
}

// Owner gets this when a vet posts feedback.
export async function sendVetReviewEmail(opts: {
  to: string;
  consultId: string;
  vetName: string;
  verdict: string;
  feedback: string;
}) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = new URL(`/consults/${opts.consultId}`, base).toString();
  const subject = `Your vet review is ready — ${opts.verdict}`;
  const text = `${opts.vetName} reviewed your consult and marked it "${opts.verdict}".

Notes:
${opts.feedback}

Read the full review: ${url}

— Amia Vet`;
  return client().emails.send({
    from: fromAddress(),
    to: opts.to,
    subject,
    text,
  });
}

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

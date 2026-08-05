// Thin Resend wrapper for transactional notifications (magic-link emails are
// sent by the Auth.js Resend provider directly). No-ops if the key is unset,
// so local dev without email still works.
import { Resend } from "resend";

let resend: Resend | null = null;
function client(): Resend | null {
  if (!process.env.AUTH_RESEND_KEY) return null;
  if (!resend) resend = new Resend(process.env.AUTH_RESEND_KEY);
  return resend;
}

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const c = client();
  if (!c) {
    console.warn(`[email] AUTH_RESEND_KEY not set; skipping email to ${params.to}: "${params.subject}"`);
    return;
  }
  await c.emails.send({
    from: process.env.EMAIL_FROM || "Amia Vet <hello@amiavet.com>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

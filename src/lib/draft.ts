// ============================================================
// Draft preservation across the auth redirect.
// The public ask box lets an owner type a question BEFORE logging in.
// We sign the draft (HMAC over the payload with AUTH_SECRET) and stash it
// in an httpOnly cookie, then process it automatically after sign-in.
// Server-only (uses node:crypto).
// ============================================================
import crypto from "crypto";
import { requireEnv } from "@/lib/env";

export const DRAFT_COOKIE = "amia_draft";

export interface AskDraft {
  question: string;
  petId?: string;
  newPet?: {
    name: string;
    species: string;
    breed?: string;
    sex?: string;
    birthdateOrAge?: string;
    weightLbs?: number;
  };
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", requireEnv("AUTH_SECRET")).update(payload).digest());
}

export function encodeDraft(draft: AskDraft): string {
  const payload = b64url(Buffer.from(JSON.stringify(draft)));
  return `${payload}.${sign(payload)}`;
}

export function decodeDraft(token?: string | null): AskDraft | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
    return JSON.parse(json) as AskDraft;
  } catch {
    return null;
  }
}

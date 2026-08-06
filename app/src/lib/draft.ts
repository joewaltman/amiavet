// Signed-cookie helpers for a pre-auth "draft consult question".
// Public visitors type into the ask box → we stash the question here → they
// sign in → the dashboard picks it up and completes the consult.
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "amia_draft";
const SAVE_INTENT_COOKIE = "amia_save_intent";
const MAX_AGE_S = 60 * 60; // 1h — plenty for a magic-link roundtrip.

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", key()).update(value).digest("base64url");
}

function verify(value: string, sig: string): boolean {
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type DraftConsult = {
  question: string;
  petId?: string;
  createdAt: number;
};

export async function setDraft(draft: DraftConsult) {
  const value = Buffer.from(JSON.stringify(draft)).toString("base64url");
  const sig = sign(value);
  const jar = await cookies();
  jar.set(COOKIE, `${value}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function getDraft(): Promise<DraftConsult | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(value, sig)) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as DraftConsult;
  } catch {
    return null;
  }
}

export async function clearDraft() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// -------------------------------------------------------------------
// Save intent: parallel to draft, but stores the entire completed
// two-stage session (question + triage + follow-up answers + answer)
// so we can replay the save after the anon user signs in.
// -------------------------------------------------------------------

// SaveIntent is stored as an opaque object shape — the schema lives in
// ai/schemas.ts and is validated on read by /api/consults/complete-save.
export type SaveIntent = Record<string, unknown>;

export async function setSaveIntent(payload: SaveIntent) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(value);
  const jar = await cookies();
  jar.set(SAVE_INTENT_COOKIE, `${value}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function getSaveIntent(): Promise<SaveIntent | null> {
  const jar = await cookies();
  const raw = jar.get(SAVE_INTENT_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(value, sig)) return null;
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as SaveIntent;
  } catch {
    return null;
  }
}

export async function clearSaveIntent() {
  const jar = await cookies();
  jar.delete(SAVE_INTENT_COOKIE);
}

// Peek without decoding — used by pages that just need to know if a
// save intent cookie exists so they can redirect to the completion route.
export async function hasSaveIntent(): Promise<boolean> {
  const jar = await cookies();
  return !!jar.get(SAVE_INTENT_COOKIE)?.value;
}

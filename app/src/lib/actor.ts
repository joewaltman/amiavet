// Resolves the current caller to an Actor — either the authed user or
// an auto-materialized guest User row.
//
// Guests are backed by two cookies set atomically the first time we
// meet a visitor:
//   * amia_guest        (httpOnly, signed)  — { userId, guestToken }
//   * amia_guest_pub    (JS-readable)       — just guestToken
// The pub cookie exists so posthog-js can bootstrap its distinct_id to
// the same value we use server-side.
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const COOKIE = "amia_guest";
const PUB_COOKIE = "amia_guest_pub";
const MAX_AGE_S = 60 * 60 * 24 * 60; // 60 days

export type Actor = {
  userId: string;
  isGuest: boolean;
  guestToken: string | null; // present iff isGuest
};

// ------------------ cookie signing helpers ------------------

function key(): string {
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

type GuestCookiePayload = { userId: string; guestToken: string };

export function parseGuestCookie(raw: string | undefined): GuestCookiePayload | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(value, sig)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as GuestCookiePayload;
    if (
      !parsed ||
      typeof parsed.userId !== "string" ||
      typeof parsed.guestToken !== "string"
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function serializeGuestCookie(payload: GuestCookiePayload): string {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${value}.${sign(value)}`;
}

// ------------------ getActor / getActorOrNull ------------------

// Returns the authed user (if signed in) or the existing guest resolved
// from cookies; returns null if no session and no valid guest cookie.
// Never materializes a new guest.
export async function getActorOrNull(): Promise<Actor | null> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) {
    return { userId, isGuest: false, guestToken: null };
  }

  const jar = await cookies();
  const parsed = parseGuestCookie(jar.get(COOKIE)?.value);
  if (!parsed) return null;

  // Confirm the row still exists and is still a guest. If someone
  // signed in/out or the row was pruned, treat the cookie as invalid.
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, isGuest: true, guestToken: true },
  });
  if (!user || !user.isGuest || user.guestToken !== parsed.guestToken) {
    return null;
  }
  return { userId: user.id, isGuest: true, guestToken: user.guestToken };
}

// Resolves an Actor, materializing a new guest User + setting cookies
// if no authed session and no valid guest cookie is present.
export async function getActor(): Promise<Actor> {
  const existing = await getActorOrNull();
  if (existing) return existing;

  // No session, no valid guest cookie -> mint a fresh guest.
  const guestToken = randomBytes(24).toString("base64url");
  const user = await prisma.user.create({
    data: {
      isGuest: true,
      guestToken,
      role: "owner",
    },
    select: { id: true, guestToken: true },
  });

  const jar = await cookies();
  const cookieVal = serializeGuestCookie({
    userId: user.id,
    guestToken: user.guestToken!,
  });
  const secure = process.env.NODE_ENV === "production";
  jar.set(COOKIE, cookieVal, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE_S,
  });
  jar.set(PUB_COOKIE, user.guestToken!, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE_S,
  });

  return { userId: user.id, isGuest: true, guestToken: user.guestToken! };
}

// Returns the distinct_id we should use for a server-side PostHog event
// captured on behalf of this actor. Guests -> guestToken; authed -> userId.
export function actorDistinctId(actor: Actor): string {
  return actor.isGuest && actor.guestToken ? actor.guestToken : actor.userId;
}

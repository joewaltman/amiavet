// POST /api/after-auth/set — client-callable helper that sets the
// short-lived signed httpOnly cookie describing which paid checkout
// the user wanted to hit. Called from ask-flow.tsx right before it
// pushes the guest to /login.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";

const COOKIE = "amia_after_auth";
const MAX_AGE_S = 15 * 60;

const Body = z.object({
  intent: z.enum(["review", "video"]),
  consultId: z.string().min(1),
});

function sign(v: string) {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set");
  return createHmac("sha256", s).update(v).digest("base64url");
}

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const payload = { ...body, createdAt: Date.now() };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return NextResponse.json({ ok: true });
}

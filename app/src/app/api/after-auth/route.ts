// GET /api/after-auth — post-login handoff for paid CTAs.
//
// Flow:
//   1. Guest clicks $20 review / $40 video on the ask flow.
//   2. Client sets a short-lived signed httpOnly cookie
//      (amia_after_auth = { intent, consultId }) and redirects to
//      /login?callbackUrl=/api/after-auth.
//   3. On success, Auth.js runs events.signIn (claim-or-merge repoints
//      the consult onto the authed user) and finally redirects here.
//   4. This handler validates the cookie, verifies ownership on the
//      claimed consult, spins up a Stripe checkout session, and 303s
//      to the Stripe URL.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createConsultCheckout } from "@/lib/stripe";

export const runtime = "nodejs";

const COOKIE = "amia_after_auth";

const IntentSchema = z.object({
  intent: z.enum(["review", "video"]),
  consultId: z.string().min(1),
  // 15-minute TTL enforced here in addition to the cookie's own maxAge,
  // so a stale cookie that survived a browser restart still gets kicked.
  createdAt: z.number(),
});
type Intent = z.infer<typeof IntentSchema>;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set");
  return s;
}
function sign(v: string) {
  return createHmac("sha256", key()).update(v).digest("base64url");
}
function verify(v: string, sig: string) {
  const expected = sign(v);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseIntent(raw: string | undefined): Intent | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(value, sig)) return null;
  try {
    const obj = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = IntentSchema.safeParse(obj);
    if (!parsed.success) return null;
    if (Date.now() - parsed.data.createdAt > 15 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

async function clearCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return redirectTo("/login?callbackUrl=/api/after-auth");

  const jar = await cookies();
  const intent = parseIntent(jar.get(COOKIE)?.value);
  if (!intent) {
    await clearCookie();
    return redirectTo("/dashboard");
  }

  const consult = await prisma.consult.findUnique({
    where: { id: intent.consultId },
    select: { id: true, ownerId: true },
  });
  if (!consult || consult.ownerId !== userId) {
    // events.signIn should have repointed ownership already. If it
    // didn't (empty guest cookie, or claim-or-merge failed), bail to
    // the dashboard rather than starting a checkout for someone
    // else's consult.
    await clearCookie();
    return redirectTo("/dashboard");
  }

  const email = session?.user?.email;
  if (!email) {
    await clearCookie();
    return redirectTo("/dashboard");
  }

  const checkout = await createConsultCheckout({
    consultId: consult.id,
    kind: intent.intent,
    ownerEmail: email,
  });

  await prisma.payment.create({
    data: {
      consultId: consult.id,
      ownerId: userId,
      kind: intent.intent,
      amountCents: intent.intent === "review" ? 2000 : 4000,
      currency: "usd",
      status: "pending",
      stripeCheckoutSessionId: checkout.id,
    },
  });

  await clearCookie();
  return redirectTo(checkout.url!);
}

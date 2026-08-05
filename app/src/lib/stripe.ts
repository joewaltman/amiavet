// Server-only Stripe client and checkout helpers.
import "server-only";
import Stripe from "stripe";

let _client: Stripe | null = null;
export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  _client = new Stripe(key);
  return _client;
}

export function absoluteUrl(path: string): string {
  const base =
    process.env.AUTH_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000");
  return new URL(path, base).toString();
}

export type CheckoutKind = "review" | "video";

export function priceIdFor(kind: CheckoutKind): string {
  const id =
    kind === "review"
      ? process.env.STRIPE_PRICE_REVIEW
      : process.env.STRIPE_PRICE_VIDEO;
  if (!id) throw new Error(`Missing Stripe price for ${kind}`);
  return id;
}

export async function createConsultCheckout(opts: {
  consultId: string;
  kind: CheckoutKind;
  ownerEmail: string;
}) {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: opts.ownerEmail,
    line_items: [{ price: priceIdFor(opts.kind), quantity: 1 }],
    success_url: absoluteUrl(
      `/consults/${opts.consultId}?paid=${opts.kind}`
    ),
    cancel_url: absoluteUrl(`/consults/${opts.consultId}?canceled=1`),
    metadata: {
      consultId: opts.consultId,
      kind: opts.kind,
    },
  });
  return session;
}

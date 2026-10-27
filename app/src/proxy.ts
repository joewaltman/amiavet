// Posterna, in monitor mode. It labels each request (a person, a verified
// crawler or agent, a failed claim, or other automation) and counts the
// labels. While agents.yaml says `mode: monitor` it never blocks a request
// or changes a response. Setting POSTERNA_MODE=monitor on the server also
// turns enforcement off, whatever agents.yaml says.
// Guide: https://github.com/posternahq/posterna/blob/main/docs/install.md
import type { NextRequest } from "next/server";
import { getPosterna, withPosterna } from "@posterna/next";

// The sign-in forms on /login are server actions, which arrive as
// POST /login. Auth.js's own endpoints take POST /api/auth/signin/<provider>.
function isSignup(request: NextRequest): boolean {
  if (request.method !== "POST") return false;
  const path = request.nextUrl.pathname;
  return path === "/login" || path.startsWith("/api/auth/signin/");
}

export const proxy = withPosterna(
  {
    // Railway's edge overwrites X-Real-IP with the client's address, also
    // with Cloudflare in front (checked 27 October 2026), so read only that.
    clientIpHeader: "x-real-ip",
    // The hostname agents sign. www.amiavet.com is not served by this app.
    publicHost: "amiavet.com",
  },
  (request) => {
    if (!isSignup(request)) return;
    // Log the sign-up recommendation only. The forms work exactly as before.
    const state = getPosterna(request);
    if (!state) return;
    const decision = state.decide({ kind: "signup" });
    console.info(
      `[posterna] sign-up recommendation: ${decision.action} (verdict: ${state.result.verdict}, enforced: ${decision.enforced}, rule: ${decision.rule ?? "none"})`,
    );
  },
);

export const config = {
  matcher: [
    // Every route except build output, image optimization, the favicon, the
    // PostHog proxy (so verdict headers are never forwarded to PostHog), and
    // the Stripe and Cal.com webhooks (they verify the raw request body).
    "/((?!_next/static|_next/image|favicon.ico|ingest/|api/stripe/webhook|api/calcom/webhook).*)",
  ],
};

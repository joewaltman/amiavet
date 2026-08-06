// TEMPORARY: PostHog server-plumbing verification.
//
// Hit this once after deploying and confirm a "plumbing_test" event
// shows up in PostHog's Activity view under distinct_id = setup-check.
// Then DELETE this file — it does not belong in production.
import { NextResponse } from "next/server";
import { posthogServer } from "@/lib/posthogServer";

export async function GET() {
  const client = posthogServer();
  client.capture({
    distinctId: "setup-check",
    event: "plumbing_test",
    properties: { source: "api/ph-test", runtime: "nodejs" },
  });
  // Flush synchronously so the event lands before we return, even in
  // short-lived request contexts.
  await client.flush();
  return NextResponse.json({ ok: true });
}

// Server-only analytics wrapper. Kept in a separate file so client
// bundles that import ./analytics for trackClient never trace into
// posthog-node (which imports "server-only" and blows up the build).
import "server-only";
import { posthogServer } from "@/lib/posthogServer";
import type { AnalyticsEventName, AnalyticsPropsMap } from "./analytics";

function analyticsEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

// distinctId MUST reflect the actor identity — guestToken for
// anonymous callers, userId for authed callers — so the person
// timeline stays continuous across the sign-in stitch. Fire-and-forget;
// posthog-node batches internally and drains on SIGTERM.
export function trackServer<E extends AnalyticsEventName>(
  distinctId: string,
  event: E,
  props: AnalyticsPropsMap[E]
): void {
  if (!analyticsEnabled()) return;
  try {
    posthogServer().capture({
      distinctId,
      event,
      properties: props as Record<string, unknown>,
    });
  } catch (err) {
    console.warn("trackServer failed:", err);
  }
}

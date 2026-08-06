// Typed PostHog event wrappers. Central catalog of every funnel event
// + a strict prop map — the exported helpers refuse to compile against
// unknown events or unknown props for a known event.
//
// No email/PII ever sent; the prop maps are the allow-list. Both
// wrappers no-op if NEXT_PUBLIC_POSTHOG_KEY is unset (local dev
// without PostHog credentials).

export const AnalyticsEvent = {
  QuestionStarted: "question_started",
  QuestionSubmitted: "question_submitted",
  TriageCompleted: "triage_completed",
  FollowupShown: "followup_shown",
  FollowupSubmitted: "followup_submitted",
  AnswerGenerated: "answer_generated",
  AnswerViewed: "answer_viewed",
  CtaClicked: "cta_clicked",
  AuthGateShown: "auth_gate_shown",
  AuthStarted: "auth_started",
  AuthCompleted: "auth_completed",
  GuestClaimed: "guest_claimed",
  GuestMerged: "guest_merged",
  PaymentSucceeded: "payment_succeeded",
  VetReviewCompleted: "vet_review_completed",
  FreeLimitHit: "free_limit_hit",
} as const;
export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type AnalyticsPropsMap = {
  question_started: { sessionId: string };
  question_submitted: {
    sessionId: string;
    isGuest: boolean;
    petId: string | null;
  };
  triage_completed: {
    sessionId: string;
    decision: "answer_now" | "need_more_info" | "emergency";
    topic: string | null;
  };
  followup_shown: { sessionId: string; numQuestions: number };
  followup_submitted: { sessionId: string; numQuestions: number };
  answer_generated: {
    sessionId: string;
    urgency: string;
    isEmergency: boolean;
  };
  answer_viewed: { sessionId: string; consultId: string | null };
  cta_clicked: { consultId: string; tier: "vet_review" | "video" };
  auth_gate_shown: {
    trigger: "review" | "video" | "save" | "free_limit";
  };
  auth_started: { method: "google" | "email" };
  auth_completed: {
    method: "google" | "email";
    isNewUser: boolean;
    claimType: "upgrade" | "merge" | "none";
  };
  guest_claimed: { fromGuestToken: string; userId: string };
  guest_merged: { fromGuestToken: string; userId: string };
  payment_succeeded: {
    consultId: string;
    tier: "review" | "video";
    amountCents: number;
  };
  vet_review_completed: { consultId: string };
  free_limit_hit: { limit: number };
};

// True iff the PostHog key is present at runtime. Both public and
// server code check this before calling into the SDK.
function analyticsEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

// ---------------- client wrapper ----------------

// Fires an event on the browser's posthog-js instance. distinct_id is
// managed by posthog-js itself (bootstrapped from amia_guest_pub cookie
// in instrumentation-client.ts, then swapped via posthog.identify()
// after auth).
export function trackClient<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsPropsMap[E]
): void {
  if (typeof window === "undefined") return;
  if (!analyticsEnabled()) return;
  // Lazy import so this module stays importable from server components.
  // posthog-js registers side effects on import, so we require it only
  // after the environment check.
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.capture(event, props);
    })
    .catch(() => {
      // Analytics failures never bubble to the UI.
    });
}

// trackServer lives in ./analytics-server.ts so client bundles that
// import this file for trackClient / the type map never trace into
// posthog-node's "server-only" chain.

// ---------------- guest identity stitch ----------------

// Reads the amia_guest_pub cookie (set by /api/consults/triage the
// first time a guest hits the server) and calls posthog.identify() so
// the client's distinct_id matches the guestToken the server is using.
// posthog-js emits $identify with $anon_distinct_id set to the previous
// SDK-generated anon id, so PostHog's backend merges the pre-cookie
// pageview + question_started events onto the same person as every
// subsequent server event.
//
// Idempotent per browser session via sessionStorage; safe to call from
// multiple places.
const GUEST_ID_SENTINEL = "amia_ph_guest_id_v1";

export function identifyGuestFromCookie(): void {
  if (typeof window === "undefined") return;
  if (!analyticsEnabled()) return;
  const match = document.cookie.match(/(?:^|; )amia_guest_pub=([^;]+)/);
  if (!match) return;
  const guestToken = decodeURIComponent(match[1]);
  try {
    if (window.sessionStorage.getItem(GUEST_ID_SENTINEL) === guestToken) return;
  } catch {
    // sessionStorage can throw in strict privacy modes; fall through.
  }
  import("posthog-js")
    .then(({ default: posthog }) => {
      const current = posthog.get_distinct_id?.();
      if (current === guestToken) {
        try {
          window.sessionStorage.setItem(GUEST_ID_SENTINEL, guestToken);
        } catch {
          /* ignore */
        }
        return;
      }
      posthog.identify(guestToken);
      try {
        window.sessionStorage.setItem(GUEST_ID_SENTINEL, guestToken);
      } catch {
        /* ignore */
      }
    })
    .catch(() => {
      // Analytics failures never bubble to the UI.
    });
}

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

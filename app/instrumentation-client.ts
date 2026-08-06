// PostHog browser SDK bootstrap.
//
// Next.js loads this file exactly once on the client, before any React
// component renders. We initialize posthog-js against our own /ingest
// proxy (see next.config.ts rewrites) so ad blockers that block
// *.posthog.com still let events through.
//
// Plumbing only: this file just wires up the SDK. No custom events are
// captured here — auto-captured $pageview / $pageleave is enough to
// verify the pipeline. Business/funnel events land in a later PR.
import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  capture_pageview: true,
  capture_pageleave: true,
  person_profiles: "always",
});

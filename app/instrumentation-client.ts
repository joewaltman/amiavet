// PostHog browser SDK bootstrap.
//
// Next.js loads this file exactly once on the client, before any React
// component renders. We initialize posthog-js against our own /ingest
// proxy (see next.config.ts rewrites) so ad blockers that block
// *.posthog.com still let events through.
//
// distinct_id bootstrapping: on subsequent visits the server sets a
// non-httpOnly amia_guest_pub cookie holding the guestToken; if it's
// present, seed posthog-js with the same value so the very first
// browser-side event lands on the same person as the pre-init server
// events. On truly fresh visits (before any server request set the
// cookie) posthog-js falls back to its own anon id — later pageloads
// pick up the guestToken automatically.
import posthog from "posthog-js";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

const bootstrapDistinctID = readCookie("amia_guest_pub");

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  capture_pageview: true,
  capture_pageleave: true,
  person_profiles: "always",
  ...(bootstrapDistinctID
    ? {
        bootstrap: {
          distinctID: bootstrapDistinctID,
          isIdentifiedID: false,
        },
      }
    : {}),
});

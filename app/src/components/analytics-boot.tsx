"use client";

// Client-side identity + attribution bootstrap for PostHog.
//
// * If we have a session, call posthog.identify(userId). posthog-js
//   automatically links the previous anonymous distinct_id (either the
//   guestToken bootstrapped from amia_guest_pub, or the SDK's own
//   auto-generated id) onto the identified person.
// * On the first mount per browser session, capture initial UTM +
//   referrer via people.set_once so they stick to the person profile
//   without being overwritten on later pageviews.
//
// Mount once per top-level layout — safe to mount twice (idempotent),
// but no reason to.
import { useEffect } from "react";

const BOOT_FLAG = "amia_ph_boot_v1";

type Props = {
  session: { userId: string } | null;
};

export function AnalyticsBoot({ session }: Props) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    let cancelled = false;
    (async () => {
      const { default: posthog } = await import("posthog-js");
      if (cancelled) return;

      // First-mount attribution capture. sessionStorage flag prevents
      // repeated calls from clobbering the initial values (set_once is
      // itself no-op after first set, but skipping the work is cheaper).
      try {
        if (!sessionStorage.getItem(BOOT_FLAG)) {
          sessionStorage.setItem(BOOT_FLAG, "1");
          const params = new URLSearchParams(window.location.search);
          const attrib: Record<string, string> = {};
          for (const k of [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
          ]) {
            const v = params.get(k);
            if (v) attrib[`initial_${k}`] = v;
          }
          if (document.referrer) {
            attrib.initial_referrer = document.referrer;
          }
          if (Object.keys(attrib).length > 0) {
            posthog.people.set_once(attrib);
          }
        }
      } catch {
        // sessionStorage can throw in strict privacy modes; ignore.
      }

      // Identity stitch.
      if (session?.userId) {
        try {
          if (posthog.get_distinct_id() !== session.userId) {
            posthog.identify(session.userId);
          }
        } catch {
          // Ignore — posthog-js may not be fully init'd yet on the very
          // first render; a subsequent re-mount will retry.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  return null;
}

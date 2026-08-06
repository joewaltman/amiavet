// Server-side PostHog client. Talks directly to PostHog (not via the
// /ingest reverse proxy — that only exists to route browser traffic
// around ad blockers). Railway runs a persistent Node process, so we
// keep exactly one PostHog instance across the process lifetime.
//
// Plumbing only: this file just exposes the client. Business events are
// captured by callers in a later PR.
import "server-only";
import { PostHog } from "posthog-node";

declare global {
  // Cache across HMR reloads in dev so we don't leak PostHog instances.
  // eslint-disable-next-line no-var
  var __amia_posthog: PostHog | undefined;
  // eslint-disable-next-line no-var
  var __amia_posthog_shutdown_registered: boolean | undefined;
}

function build(): PostHog {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key) throw new Error("NEXT_PUBLIC_POSTHOG_KEY not set");
  if (!host) throw new Error("NEXT_PUBLIC_POSTHOG_HOST not set");
  // flushAt/flushInterval left at library defaults; small batches +
  // periodic flush is fine for our volume. shutdown() below drains
  // on SIGTERM so deploys don't lose the tail of the queue.
  return new PostHog(key, { host });
}

export function posthogServer(): PostHog {
  if (!globalThis.__amia_posthog) {
    globalThis.__amia_posthog = build();
  }
  if (!globalThis.__amia_posthog_shutdown_registered) {
    globalThis.__amia_posthog_shutdown_registered = true;
    const shutdown = async () => {
      try {
        await globalThis.__amia_posthog?.shutdown();
      } catch (err) {
        console.error("posthog shutdown failed:", err);
      }
    };
    // Railway sends SIGTERM on redeploy; SIGINT covers local Ctrl-C.
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }
  return globalThis.__amia_posthog;
}

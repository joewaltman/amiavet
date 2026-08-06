// Auth.js v5 configuration.
// - Prisma adapter for user/session storage
// - Google OAuth (primary sign-in)
// - Resend magic link (email fallback / vet invites)
// - Role stored on the User model, exposed on the session
// - events.signIn upgrades or merges a guest User row (see lib/claim.ts)
//   and stitches the pre-auth PostHog person onto the new userId.
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseGuestCookie } from "@/lib/actor";
import { claimOrMerge } from "@/lib/claim";
import { trackServer } from "@/lib/analytics-server";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=1",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
  ],
  callbacks: {
    // Attach role + id to the session for role gates.
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as { id?: string }).id = user.id;
        (session.user as { role?: string }).role =
          (user as unknown as { role?: string }).role ?? "owner";
      }
      return session;
    },
  },
  events: {
    // Fires after Auth.js has committed the user + session to the DB —
    // the safest place to mutate our own tables and clear the guest
    // cookie without racing the redirect. Any throw here is logged but
    // does not fail the sign-in (Auth.js swallows event errors).
    async signIn({ user, account, isNewUser }) {
      try {
        const jar = await cookies();
        const raw = jar.get("amia_guest")?.value;
        // Best-effort: no guest cookie means there is nothing to claim.
        const parsed = raw ? parseGuestCookie(raw) : null;

        // Detect the sign-in method for analytics. Resend = email magic
        // link; Google = google. Fallback = email (the only other path
        // configured is verify-token flow via Resend).
        const method: "google" | "email" =
          account?.provider === "google" ? "google" : "email";

        let claimType: "upgrade" | "merge" | "none" = "none";
        if (parsed && parsed.userId !== user.id) {
          claimType = await claimOrMerge({
            guestUserId: parsed.userId,
            targetUserId: user.id!,
            targetIsNewUser: !!isNewUser,
          });
        }

        // Always clear the guest cookies once we know a real session is
        // in play — whether or not there was anything to claim. Keeping
        // them around would let a future getActor() try to resolve a
        // now-deleted guest row.
        if (raw) {
          jar.set("amia_guest", "", { path: "/", maxAge: 0 });
        }
        if (jar.get("amia_guest_pub")) {
          jar.set("amia_guest_pub", "", { path: "/", maxAge: 0 });
        }

        // Server-side identity stitch. posthog-node accepts a
        // $identify event with $anon_distinct_id — the pre-auth
        // guestToken — which merges that timeline onto the new person
        // keyed by userId. Skip if there was never a guest cookie.
        if (parsed?.guestToken) {
          trackServer(user.id!, "auth_completed", {
            method,
            isNewUser: !!isNewUser,
            claimType,
          });
          // The $identify itself: emit via posthog-node directly to
          // include the $anon_distinct_id property that trackServer's
          // typed map doesn't cover.
          try {
            const { posthogServer } = await import("@/lib/posthogServer");
            posthogServer().capture({
              distinctId: user.id!,
              event: "$identify",
              properties: { $anon_distinct_id: parsed.guestToken },
            });
          } catch (err) {
            console.warn("posthog $identify failed:", err);
          }
          if (claimType !== "none") {
            trackServer(
              user.id!,
              claimType === "merge" ? "guest_merged" : "guest_claimed",
              { fromGuestToken: parsed.guestToken, userId: user.id! }
            );
          }
        } else {
          // No guest to stitch, but still record auth_completed for
          // the funnel.
          trackServer(user.id!, "auth_completed", {
            method,
            isNewUser: !!isNewUser,
            claimType: "none",
          });
        }
      } catch (err) {
        console.error("events.signIn handler failed:", err);
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

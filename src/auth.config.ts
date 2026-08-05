// ============================================================
// Edge-safe Auth.js config.
// Contains ONLY things that can run in the Edge middleware runtime:
// providers, page overrides, and the route-authorization + session
// callbacks. The Prisma adapter and any DB access live in auth.ts.
// ============================================================
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

export default {
  // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET and AUTH_RESEND_KEY are read from env
  // automatically by Auth.js based on these provider names.
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    Resend({ from: process.env.EMAIL_FROM || "Amia Vet <hello@amiavet.com>" }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  callbacks: {
    // Runs in middleware for every matched request. Return false to block
    // (Auth.js redirects to the sign-in page, preserving the callbackUrl).
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role ?? "owner";
      const path = nextUrl.pathname;

      const isAdminArea = path.startsWith("/admin");
      const isVetArea = path.startsWith("/vet");
      const isOwnerArea =
        path.startsWith("/dashboard") ||
        path.startsWith("/pets") ||
        path.startsWith("/consult") ||
        path.startsWith("/ask/resume");

      if (isAdminArea) return isLoggedIn && role === "admin";
      if (isVetArea) return isLoggedIn && (role === "vet" || role === "admin");
      if (isOwnerArea) return isLoggedIn;
      return true; // everything else (landing, login, static) is public
    },
    // Expose id + role on the session (JWT strategy: read from token).
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? session.user.id;
        session.user.role = (token.role as "owner" | "vet" | "admin") ?? "owner";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

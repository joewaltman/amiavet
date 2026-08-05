// ============================================================
// Full Auth.js instance (Node runtime). Adds the Prisma adapter and the
// DB-aware jwt callback on top of the edge-safe base config.
// Exports handlers (for the API route), plus auth/signIn/signOut helpers.
// ============================================================
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Persist id + role into the JWT so the edge middleware can read them
    // without a database call.
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id ?? token.sub;
        token.role = (user as { role?: "owner" | "vet" | "admin" }).role ?? "owner";
      } else if (token.sub && !token.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
  },
});

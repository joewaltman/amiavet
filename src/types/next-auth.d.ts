// Augment Auth.js types with our custom fields (id + role).
import type { DefaultSession } from "next-auth";

type AppRole = "owner" | "vet" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
  }
}

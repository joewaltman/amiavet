// Simple role helpers used by the vet routes.
import { auth } from "@/lib/auth";

export async function requireVet() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "vet" && role !== "admin")) {
    return null;
  }
  return session;
}

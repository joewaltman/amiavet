// Server-side session helpers. Import only in server components / actions.
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Require the vet role (admins allowed too). Redirects otherwise. */
export async function requireVet() {
  const user = await requireUser();
  if (user.role !== "vet" && user.role !== "admin") redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

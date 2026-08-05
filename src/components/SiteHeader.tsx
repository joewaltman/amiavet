import Link from "next/link";
import { Brand } from "@/components/Brand";
import { getSessionUser } from "@/lib/auth-helpers";
import { signOut } from "@/auth";

export async function SiteHeader() {
  const user = await getSessionUser();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" aria-label="Amia Vet home">
          <Brand />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden text-sm font-medium text-muted hover:text-sage-dark sm:inline">
                Dashboard
              </Link>
              {(user.role === "vet" || user.role === "admin") && (
                <Link href="/vet" className="text-sm font-medium text-muted hover:text-sage-dark">
                  Vet queue
                </Link>
              )}
              {user.role === "admin" && (
                <Link href="/admin" className="text-sm font-medium text-muted hover:text-sage-dark">
                  Admin
                </Link>
              )}
              <form action={doSignOut}>
                <button type="submit" className="text-sm font-medium text-muted hover:text-sage-dark">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn px-4 py-2 text-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

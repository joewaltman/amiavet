import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { AmiaLogo } from "@/components/amia-logo";

// Sticky, frosted-glass site header. Shows Sign in when logged out; name +
// role links when logged in. Uses the shared AmiaLogo SVG.
export async function SiteHeader() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <header
      aria-label="Site header"
      className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-cream/80 backdrop-blur-md supports-[backdrop-filter]:bg-cream/70"
    >
      <div className="wrap flex items-center justify-between gap-4 py-4">
        <Link
          href="/"
          aria-label="Amia Vet home"
          className="flex items-center gap-3 text-ink no-underline"
        >
          <AmiaLogo size={40} />
          <span className="text-[1.28rem] font-extrabold tracking-tight">
            Amia&nbsp;Vet
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-ink hover:underline">
                My pets
              </Link>
              {role === "vet" || role === "admin" ? (
                <Link href="/vet" className="text-ink hover:underline">
                  Vet queue
                </Link>
              ) : null}
              <span className="hidden text-neutral-500 sm:inline">
                {session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="btn-secondary" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

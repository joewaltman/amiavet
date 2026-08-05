import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const check = typeof sp.check === "string";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="card">
          <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Sign in to see your pet's consult and — when you're ready — request
            a vet review.
          </p>

          {check ? (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              Check your email for a sign-in link.
            </p>
          ) : null}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="mt-6"
          >
            <button className="btn w-full" type="submit">
              Continue with Google
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
            <div className="h-px flex-1 bg-neutral-200" />
            or
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <form
            action={async (fd) => {
              "use server";
              const email = String(fd.get("email") ?? "").trim();
              if (!email) return;
              await signIn("resend", { email, redirectTo: "/dashboard" });
            }}
            className="space-y-3"
          >
            <label className="label" htmlFor="email">
              Email a magic link
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              placeholder="you@example.com"
            />
            <button className="btn-secondary w-full" type="submit">
              Send link
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

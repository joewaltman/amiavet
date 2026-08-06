import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { LoginForms } from "./login-forms";

// The default post-login destination when no callbackUrl is supplied.
// Paid-CTA flows override this to /api/after-auth so the server can
// spin up Stripe checkout with the freshly-claimed consult.
const DEFAULT_CALLBACK = "/dashboard";
// Only allow same-origin path callbacks — never a full URL — to keep
// this off open-redirect audits.
const ALLOWED_CALLBACKS = new Set(["/dashboard", "/api/after-auth", "/"]);

function pickCallback(raw: string | string[] | undefined): string {
  if (typeof raw !== "string") return DEFAULT_CALLBACK;
  return ALLOWED_CALLBACKS.has(raw) ? raw : DEFAULT_CALLBACK;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const callbackUrl = pickCallback(sp.callbackUrl);
  if (session?.user) redirect(callbackUrl);

  const check = typeof sp.check === "string";

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }
  async function signInWithEmail(fd: FormData) {
    "use server";
    const email = String(fd.get("email") ?? "").trim();
    if (!email) return;
    await signIn("resend", { email, redirectTo: callbackUrl });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="card">
          <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Sign in to see your pet&apos;s consult and — when you&apos;re ready — request
            a vet review.
          </p>

          {check ? (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              Check your email for a sign-in link.
            </p>
          ) : null}

          <LoginForms
            signInWithGoogle={signInWithGoogle}
            signInWithEmail={signInWithEmail}
          />
        </div>
      </main>
    </>
  );
}

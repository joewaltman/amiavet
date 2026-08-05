import { signIn } from "@/auth";
import { BrandMark } from "@/components/Brand";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/dashboard";

  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: next });
  }

  async function magicLink(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("resend", { email, redirectTo: next });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
      <BrandMark size={48} />
      <h1 className="mt-4 text-2xl font-extrabold">Sign in to Amia Vet</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Create an account or sign in. We&apos;ll keep the question you started.
      </p>

      <div className="mt-8 w-full space-y-4">
        <form action={googleSignIn}>
          <button type="submit" className="btn-outline w-full">
            Continue with Google
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-hairline" />
          or
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <form action={magicLink} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input id="email" name="email" type="email" required className="field" placeholder="you@email.com" />
          </div>
          <button type="submit" className="btn w-full">
            Email me a magic link
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        By continuing you agree that Amia&apos;s free answers are AI-generated information, not veterinary advice.
      </p>
    </div>
  );
}

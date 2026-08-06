"use client";

// Splits out the two sign-in forms as a client component so we can
// fire auth_started before delegating to the server action. Server
// actions can't call posthog-js directly.
import { trackClient } from "@/lib/analytics";

type Props = {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (fd: FormData) => Promise<void>;
};

export function LoginForms({ signInWithGoogle, signInWithEmail }: Props) {
  return (
    <>
      <form
        action={signInWithGoogle}
        onSubmit={() => trackClient("auth_started", { method: "google" })}
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
        action={signInWithEmail}
        onSubmit={() => trackClient("auth_started", { method: "email" })}
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
    </>
  );
}

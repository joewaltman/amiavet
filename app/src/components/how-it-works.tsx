// Three-step "How it works" section. Server component; no client state.
export function HowItWorks() {
  return (
    <section id="how" className="section" aria-labelledby="how-title">
      <div className="wrap">
        <div className="mx-auto mb-11 max-w-2xl text-center">
          <h2
            id="how-title"
            className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            How it works
          </h2>
          <p className="mt-3 text-lg text-[color:var(--muted)]">
            Start free in seconds. Bring in a licensed veterinarian only if you
            want one.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Step
            n={1}
            title="Tell us what's going on"
            body="Type in the question you'd text a vet friend, with a few details about your pet."
          />
          <Step
            n={2}
            title="Get an instant AI answer"
            body={
              <>
                Our AI gives you a focused first look, clearly labeled as AI.{" "}
                <span className="font-semibold text-terracotta">
                  Not a vet, and not medical advice.
                </span>
              </>
            }
          />
          <Step
            n={3}
            title="Bring in a licensed vet if you want one"
            body="A California-licensed veterinarian can review your answer for $20, or meet you on a 15-minute video call for $40."
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--border)] bg-white p-7 shadow-[var(--shadow-sm)]">
      <div
        aria-hidden
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-sage text-base font-bold text-white"
      >
        {n}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[15px] leading-6 text-[color:var(--muted)]">
        {body}
      </p>
    </article>
  );
}

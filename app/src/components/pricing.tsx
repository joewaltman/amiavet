// Pricing section: 3 tier cards (AI-only vs licensed-vet tiers), a short
// transparency line, and the AI-only disclaimer box. Server component.
export function Pricing() {
  return (
    <section
      id="pricing"
      className="section bg-white"
      aria-labelledby="pricing-title"
    >
      <div className="wrap">
        <div className="mx-auto mb-11 max-w-2xl text-center">
          <h2
            id="pricing-title"
            className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            Simple, upfront pricing
          </h2>
          <p className="mt-3 text-lg text-[color:var(--muted)]">
            Three ways to get help, so you only pay when you want a professional.
          </p>
        </div>

        <div className="grid items-stretch gap-6 sm:grid-cols-3">
          <Tier
            eyebrow="Start here"
            tagKind="ai"
            tagLabel="AI, not a vet"
            title="Ask Amia"
            price="Free"
            body="An instant, AI-generated answer to your pet question. A smart first look, clearly labeled as AI. Not reviewed by a vet, and not veterinary advice."
          />
          <Tier
            eyebrow="Most popular"
            tagKind="vet"
            tagLabel="Licensed vet"
            title="Vet-reviewed answer"
            price="$20"
            body="A California-licensed veterinarian reviews the AI's answer, corrects anything off, and adds their own guidance."
            featured
          />
          <Tier
            eyebrow="Talk to a vet"
            tagKind="vet"
            tagLabel="Licensed vet"
            title="15-minute video visit"
            price="$40"
            body="A live video call with a California-licensed veterinarian. Honest guidance, including whether your pet needs an in-person visit."
          />
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-base text-[color:var(--muted)]">
          We're upfront about what's AI and what's a vet. You always know who,
          or what, is answering, and a licensed veterinarian is always one
          click away.
        </p>

        <p className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[color:var(--terracotta-soft)] bg-[color:var(--terracotta-soft)] px-5 py-4 text-center text-sm text-[color:#7a2c08]">
          AI guidance is for information only, is not a substitute for
          professional veterinary care, and does not create a
          veterinarian-client-patient relationship.
        </p>
      </div>
    </section>
  );
}

function Tier({
  eyebrow,
  tagKind,
  tagLabel,
  title,
  price,
  body,
  featured,
}: {
  eyebrow: string;
  tagKind: "ai" | "vet";
  tagLabel: string;
  title: string;
  price: string;
  body: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow)] ${
        featured
          ? "border-sage/50 shadow-[var(--shadow)]"
          : "border-[color:var(--border)]"
      }`}
    >
      <span className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
        {eyebrow}
      </span>
      <span className={`tier-tag tier-tag-${tagKind}`}>{tagLabel}</span>
      <h3 className="mt-1 text-xl font-semibold text-ink">{title}</h3>
      <div className="mt-2 mb-3 text-4xl font-extrabold leading-none tracking-tight text-sage">
        {price}
      </div>
      <p className="flex-1 text-[15px] text-[color:var(--muted)]">{body}</p>
    </article>
  );
}

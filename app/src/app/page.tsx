import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskFlow } from "@/components/ask-flow";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { TrustBand } from "@/components/trust-band";
import { AnalyticsBoot } from "@/components/analytics-boot";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Public home page. Same page for anonymous and signed-in visitors.
// AskFlow drives the two-stage triage → answer flow inline (no page
// navigation). Anon users get the full experience; the flow only asks
// for auth if they choose to persist (save, review, or video visit).
//
// We deliberately do NOT materialize a guest User here — Next.js
// server components are read-only for cookies, and getActor() sets
// two cookies. The guest is materialized inside /api/consults/triage
// on the first Ask click, which is a Route Handler and can mutate
// cookies. Trade-off: the very first pageview's posthog-js distinct_id
// is a random SDK anon id rather than the guestToken. The server-side
// funnel starts at question_submitted (using the guestToken directly),
// and sign-in stitches everything via $identify + $anon_distinct_id.
export default async function Home() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const pets = userId
    ? await prisma.pet.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, species: true },
      })
    : [];
  const askFlowPets = pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
  }));

  return (
    <>
      <a className="skip-link" href="#ask">
        Skip to the ask box
      </a>
      <SiteHeader />
      <AnalyticsBoot session={userId ? { userId } : null} />
      <main id="main" className="flex-1">
        {/* Hero + AskFlow */}
        <section className="hero-bg" aria-labelledby="hero-title">
          <div className="wrap max-w-3xl pt-16 pb-14 sm:pt-20">
            <span className="eyebrow">A new kind of pet care</span>
            <h1
              id="hero-title"
              className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl"
            >
              Start with a smart answer.{" "}
              <span className="text-sage">
                Get a real vet when you need one.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-[color:var(--muted)]">
              Ask a real question about your pet and get instant AI guidance.
              A California-licensed veterinarian is one click away to review
              it or meet you on a video call.
            </p>

            <div className="mt-8">
              <AskFlow initialPets={askFlowPets} isAuthed={!!userId} />
            </div>

            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Free AI answer. $20 for a vet review. $40 for a video visit.
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Amia Vet does not replace emergency care. If your pet is in
              distress, call your nearest emergency vet.
            </p>
          </div>
        </section>

        <HowItWorks />
        <Pricing />
        <TrustBand />
      </main>
      <SiteFooter />
    </>
  );
}

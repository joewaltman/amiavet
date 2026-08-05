import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskBox } from "@/components/ask-box";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { TrustBand } from "@/components/trust-band";

// Public home page. Same page for anonymous and signed-in visitors: the
// AskBox is the primary CTA at the top, followed by explanatory sections.
// The AskBox POST flow already handles the anonymous -> /login -> /dashboard
// hand-off via a signed cookie draft.
export default function Home() {
  return (
    <>
      <a className="skip-link" href="#ask">
        Skip to the ask box
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero + AskBox */}
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
              Ask a real question about your pet and get instant AI guidance,
              clearly labeled as AI. A California-licensed veterinarian is one
              click away to review it or meet you on a video call.
            </p>

            <div className="mt-8">
              <AskBox />
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

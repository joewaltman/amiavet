// Full-width sage trust section. Server component.
export function TrustBand() {
  return (
    <section
      className="section bg-sage text-white"
      aria-labelledby="trust-title"
    >
      <div className="wrap">
        <div className="mx-auto mb-11 max-w-2xl text-center">
          <h2
            id="trust-title"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Real vets when it counts
          </h2>
        </div>

        <p className="mx-auto mb-9 max-w-2xl text-center text-lg font-semibold leading-snug text-white sm:text-xl">
          Vet-reviewed answers and video visits are handled by{" "}
          <span className="text-[#FFE9DC]">
            California-licensed veterinarians
          </span>
          . The first answer is AI-generated and clearly labeled.
        </p>

        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
          <Reason
            title="Licensed California vets"
            body="Vet-reviewed answers and video visits are handled by veterinarians licensed in California."
          />
          <Reason
            title="Built by veterinary pioneers"
            body="From the team behind VetPronto, a pioneer in convenient, tech-first veterinary care."
          />
          <Reason
            title="Proudly San Diego local"
            body="Built for San Diego pet owners, with California-licensed vets."
          />
        </div>
      </div>
    </section>
  );
}

function Reason({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-6">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/85">{body}</p>
    </div>
  );
}

import { STANDING_DISCLAIMER } from "@/lib/ai/systemPrompt";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-hairline">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted">
        <p>
          <strong className="text-charcoal">Not for emergencies.</strong> If your pet has an emergency, contact your
          nearest emergency veterinary hospital.
        </p>
        <p className="max-w-3xl">{STANDING_DISCLAIMER}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="mailto:hello@amiavet.com" className="font-medium hover:text-sage-dark">
            hello@amiavet.com
          </a>
          <span className="text-neutral-400">Serving pet owners in California.</span>
          <span className="text-neutral-400">© {year} Amia Vet</span>
        </div>
      </div>
    </footer>
  );
}

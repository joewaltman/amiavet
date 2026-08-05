import Link from "next/link";
import { AmiaLogo } from "@/components/amia-logo";

// Site-wide footer. Logo + wordmark, contact + privacy links, legal fine
// print, and an auto-year copyright. Server component.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color:var(--border)] bg-cream">
      <div className="wrap flex flex-col gap-5 py-11">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Amia Vet home"
            className="flex items-center gap-3 text-ink no-underline"
          >
            <AmiaLogo size={34} />
            <span className="text-lg font-extrabold tracking-tight">
              Amia&nbsp;Vet
            </span>
          </Link>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-6 text-sm"
          >
            <a
              href="mailto:hello@amiavet.com"
              className="font-medium text-[color:var(--muted)] no-underline hover:text-[color:var(--green-dark)]"
            >
              hello@amiavet.com
            </a>
            <a
              href="#privacy"
              className="font-medium text-[color:var(--muted)] no-underline hover:text-[color:var(--green-dark)]"
            >
              Privacy
            </a>
          </nav>
        </div>

        <div className="grid max-w-3xl gap-2 border-t border-dashed border-[color:var(--border)] pt-5 text-sm text-[color:var(--muted)]">
          <p>
            <strong className="text-ink">Not for emergencies.</strong> If your
            pet has an emergency, contact your nearest emergency veterinary
            hospital.
          </p>
          <p>
            AI guidance is for information only, is not a substitute for
            professional veterinary care, and does not create a
            veterinarian-client-patient relationship.
          </p>
        </div>

        <p className="text-xs text-[color:#9a9aab]">
          © {year} Amia Vet. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

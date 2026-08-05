import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink">Not found</h1>
        <p className="mt-2 text-neutral-600">
          That page doesn't exist or you don't have access to it.
        </p>
        <Link href="/" className="btn mt-6 inline-block">
          Go home
        </Link>
      </main>
    </>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-extrabold">Not found</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find that page.</p>
      <Link href="/" className="btn mt-6">
        Back home
      </Link>
    </div>
  );
}

import Link from "next/link";
import { AskBox } from "@/components/AskBox";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// Always render dynamically (reads session + DB).
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getSessionUser();
  const pets = user
    ? await prisma.pet.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, species: true },
      })
    : [];

  const errorMsg =
    searchParams.error === "short"
      ? "Please add a little more detail to your question."
      : searchParams.error === "pet"
        ? "Please tell us which pet this is about (name and species)."
        : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <span className="pill mb-4">
          <span className="h-2 w-2 rounded-full bg-sage" aria-hidden /> California • AI + licensed vets
        </span>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Start with a smart answer.{" "}
          <span className="text-sage">Get a real vet when you need one.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Ask about your pet and get instant AI guidance, clearly labeled as AI. Want a professional? A
          California-licensed veterinarian can review it for $20 or meet you on a 15-minute video visit for $40.
        </p>
      </div>

      {errorMsg && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMsg}
        </p>
      )}

      <AskBox pets={pets} loggedIn={!!user} />

      <div className="mt-4">
        <AiDisclaimer />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Amia asks the right questions for a focused answer, and puts a licensed veterinarian one click away.{" "}
        {user ? (
          <Link href="/dashboard" className="font-semibold text-sage-dark hover:underline">
            View your dashboard
          </Link>
        ) : (
          <Link href="/login" className="font-semibold text-sage-dark hover:underline">
            Sign in
          </Link>
        )}
      </p>
    </div>
  );
}

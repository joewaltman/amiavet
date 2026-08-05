// Completes a pre-auth draft question after the owner signs in.
// The dashboard page redirects here when it sees a draft cookie, because
// Server Components can't clear cookies — only Route Handlers and Server
// Actions can.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDraft, clearDraft } from "@/lib/draft";
import { createConsult } from "@/lib/consults";

// Use a relative Location header rather than reconstructing an absolute
// URL from req.url. Behind Railway's proxy req.url reflects the internal
// http://localhost:8080 host, which would send the browser to the wrong
// origin. Browsers resolve a relative Location against the current URL
// they're actually on.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return redirectTo("/login");

  const draft = await getDraft();
  if (!draft?.question) return redirectTo("/dashboard");

  const consult = await createConsult({
    ownerId: userId,
    question: draft.question,
    petId: draft.petId,
  });
  await clearDraft();

  return redirectTo(`/consults/${consult.id}`);
}

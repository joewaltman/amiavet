// Completes a pre-auth draft question after the owner signs in.
// The dashboard page redirects here when it sees a draft cookie, because
// Server Components can't clear cookies — only Route Handlers and Server
// Actions can.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDraft, clearDraft } from "@/lib/draft";
import { createConsult } from "@/lib/consults";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const draft = await getDraft();
  if (!draft?.question) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const consult = await createConsult({
    ownerId: userId,
    question: draft.question,
    petId: draft.petId,
  });
  await clearDraft();

  return NextResponse.redirect(new URL(`/consults/${consult.id}`, req.url));
}

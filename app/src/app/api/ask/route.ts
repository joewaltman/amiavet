// POST /api/ask
//   - If the caller is not authenticated: save the question into a signed
//     cookie draft and return {redirect: "/login"} with a 401. The client
//     navigates to /login; on the way back, /dashboard picks it up.
//   - If authenticated: create the consult and hand back its id.
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { setDraft } from "@/lib/draft";
import { createConsult } from "@/lib/consults";

const Body = z.object({
  question: z.string().min(10).max(4000),
  petId: z.string().optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    await setDraft({
      question: parsed.question,
      petId: parsed.petId,
      createdAt: Date.now(),
    });
    return NextResponse.json(
      { redirect: "/login", reason: "auth_required" },
      { status: 401 }
    );
  }

  const userId = (session.user as { id: string }).id;
  const consult = await createConsult({
    ownerId: userId,
    question: parsed.question,
    petId: parsed.petId,
  });
  return NextResponse.json({ consultId: consult.id });
}

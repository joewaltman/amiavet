import { redirect } from "next/navigation";
import { consumeDraft } from "@/lib/actions";

// After sign-in, process the preserved draft and jump into the consult.
export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const consultId = await consumeDraft();
  if (consultId) redirect(`/consult/${consultId}`);
  redirect("/dashboard");
}

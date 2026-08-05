import { requireUser } from "@/lib/auth-helpers";
import { createPetAction } from "@/lib/actions";
import { PetForm } from "@/components/PetForm";

export const dynamic = "force-dynamic";

export default async function NewPetPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-extrabold">Add a pet</h1>
      <PetForm action={createPetAction} submitLabel="Save pet" />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePetForm } from "@/lib/pets";
import { PetForm } from "@/components/pet-form";

export default async function NewPetPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Add a pet</h1>
      <PetForm action={createPet} submitLabel="Add pet" />
    </div>
  );
}

async function createPet(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const data = parsePetForm(formData);
  await prisma.pet.create({ data: { ...data, ownerId: userId } });
  redirect("/dashboard");
}

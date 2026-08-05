import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePetForm } from "@/lib/pets";
import { PetForm } from "@/components/pet-form";

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet || pet.ownerId !== userId) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Edit {pet.name}</h1>
      <PetForm
        pet={pet}
        submitLabel="Save changes"
        action={async (fd) => {
          "use server";
          const s = await auth();
          if (!s?.user) redirect("/login");
          const uid = (s.user as { id: string }).id;
          const p = await prisma.pet.findUnique({ where: { id } });
          if (!p || p.ownerId !== uid) notFound();
          const data = parsePetForm(fd);
          await prisma.pet.update({ where: { id }, data });
          redirect("/dashboard");
        }}
      />
    </div>
  );
}

// Seed a test owner and a test vet (with a Vet profile) plus one sample pet.
// Run with:  npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: { role: "owner" },
    create: { email: "owner@example.com", name: "Test Owner", role: "owner" },
  });

  const vetUser = await prisma.user.upsert({
    where: { email: "vet@example.com" },
    update: { role: "vet" },
    create: { email: "vet@example.com", name: "Dr. Test Vet", role: "vet" },
  });

  await prisma.vet.upsert({
    where: { userId: vetUser.id },
    update: { active: true },
    create: {
      userId: vetUser.id,
      caLicenseNumber: "CA-TEST-0000",
      plitOnFile: true,
      active: true,
    },
  });

  // Optional: an admin for the /admin view.
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: "admin" },
    create: { email: "admin@example.com", name: "Test Admin", role: "admin" },
  });

  // A sample pet for the owner (idempotent by owner+name).
  const existingPet = await prisma.pet.findFirst({
    where: { userId: owner.id, name: "Bella" },
  });
  if (!existingPet) {
    await prisma.pet.create({
      data: {
        userId: owner.id,
        name: "Bella",
        species: "Dog",
        breed: "Labrador",
        sex: "Female (spayed)",
        birthdateOrAge: "4 years",
        weightLbs: 65,
        notes: "Generally healthy. Occasional seasonal allergies.",
      },
    });
  }

  console.log("Seed complete:");
  console.log("  owner@example.com (role: owner)  — sign in via magic link or Google");
  console.log("  vet@example.com   (role: vet)");
  console.log("  admin@example.com (role: admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

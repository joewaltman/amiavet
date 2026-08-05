// Seed one owner + one vet + one pet for local dev.
// Run: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: { role: "owner", name: "Sample Owner" },
    create: {
      email: "owner@example.com",
      name: "Sample Owner",
      role: "owner",
      emailVerified: new Date(),
    },
  });

  const vet = await prisma.user.upsert({
    where: { email: "vet@example.com" },
    update: { role: "vet", name: "Dr. Sample" },
    create: {
      email: "vet@example.com",
      name: "Dr. Sample",
      role: "vet",
      emailVerified: new Date(),
    },
  });

  const pet = await prisma.pet.upsert({
    where: { id: "seed-pet-1" },
    update: {},
    create: {
      id: "seed-pet-1",
      ownerId: owner.id,
      name: "Biscuit",
      species: "dog",
      breed: "Border Collie mix",
      sex: "male",
      neutered: true,
      birthDate: new Date("2019-04-01"),
      weightKg: 18.5,
      conditions: "Seasonal allergies",
      medications: "Apoquel (as-needed)",
      allergies: "None known",
      notes: "Very food-motivated. Nervous at the clinic.",
    },
  });

  await prisma.petSummary.upsert({
    where: { petId: pet.id },
    update: {},
    create: {
      petId: pet.id,
      runningSummary:
        "Healthy 6yo neutered male Border Collie mix (18.5 kg). History of mild seasonal allergies managed with as-needed Apoquel. No chronic conditions.",
    },
  });

  console.log("Seeded:", { owner: owner.email, vet: vet.email, pet: pet.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

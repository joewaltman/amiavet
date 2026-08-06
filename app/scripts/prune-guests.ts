// Manual cleanup: delete stale guest User rows that never engaged.
//
// Run via `npx tsx scripts/prune-guests.ts` from the app directory
// (Railway shell has tsx available via the app's devDependencies).
//
// Criteria:
//   * isGuest = true
//   * updatedAt older than GUEST_TTL_DAYS (default 30) days ago
//   * no pets
//   * no consults
//
// Guests with any real activity are left alone so we don't lose the
// pre-auth trail when they eventually come back and sign in.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ttlDays = Number.parseInt(process.env.GUEST_TTL_DAYS ?? "30", 10);
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      isGuest: true,
      updatedAt: { lt: cutoff },
      pets: { none: {} },
      consults: { none: {} },
    },
    select: { id: true },
  });

  if (candidates.length === 0) {
    console.log(`No stale guests older than ${ttlDays} days.`);
    return;
  }

  const ids = candidates.map((c) => c.id);
  const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${result.count} stale guest(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

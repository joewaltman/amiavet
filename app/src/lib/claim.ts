// Transfers Pets + Consults from a guest User row into the authed User
// row on sign-in.
//
// Called from events.signIn in lib/auth.ts. Runs inside a single
// transaction; on failure the sign-in itself still completes but the
// guest row is left intact for the next attempt.
import "server-only";
import { prisma } from "@/lib/db";

export type ClaimType = "upgrade" | "merge" | "none";

export async function claimOrMerge(opts: {
  guestUserId: string;
  targetUserId: string;
  targetIsNewUser: boolean;
}): Promise<ClaimType> {
  const { guestUserId, targetUserId, targetIsNewUser } = opts;

  // Same row (shouldn't happen in practice, but be defensive).
  if (guestUserId === targetUserId) return "none";

  return prisma.$transaction(async (tx) => {
    const guest = await tx.user.findUnique({
      where: { id: guestUserId },
      select: { id: true, isGuest: true },
    });
    if (!guest || !guest.isGuest) return "none";

    // Repoint pets + consults from the guest to the target user.
    const petsMoved = await tx.pet.updateMany({
      where: { ownerId: guestUserId },
      data: { ownerId: targetUserId },
    });
    const consultsMoved = await tx.consult.updateMany({
      where: { ownerId: guestUserId },
      data: { ownerId: targetUserId },
    });

    // Dedupe pets by (ownerId, name, species). If the target already
    // had a pet with the same identity, keep the older row and
    // repoint the newly-moved pet's consults onto it, then delete
    // the newer one.
    const targetPets = await tx.pet.findMany({
      where: { ownerId: targetUserId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, species: true, createdAt: true },
    });
    const byKey = new Map<string, { id: string; createdAt: Date }>();
    for (const p of targetPets) {
      const k = `${p.name.trim().toLowerCase()}|${p.species}`;
      const kept = byKey.get(k);
      if (!kept) {
        byKey.set(k, { id: p.id, createdAt: p.createdAt });
        continue;
      }
      // Kept = older; current p = newer. Repoint newer's consults
      // onto kept and delete newer.
      await tx.consult.updateMany({
        where: { petId: p.id },
        data: { petId: kept.id },
      });
      await tx.pet.delete({ where: { id: p.id } });
    }

    // Guest row is now empty; delete it (cascades GuestUsageDay).
    await tx.user.delete({ where: { id: guestUserId } });

    if (petsMoved.count === 0 && consultsMoved.count === 0) return "none";
    return targetIsNewUser ? "upgrade" : "merge";
  });
}

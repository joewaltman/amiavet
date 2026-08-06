// Lightweight per-guest daily rate limit. Backed by GuestUsageDay in
// Postgres — no Redis dependency. A guest gets a fresh bucket per UTC
// calendar day.
import "server-only";
import { prisma } from "@/lib/db";

function todayUtc(): string {
  // YYYY-MM-DD in UTC. Matches the GuestUsageDay.day column format.
  return new Date().toISOString().slice(0, 10);
}

export function freeGuestCap(): number {
  const raw = process.env.FREE_GUEST_QUESTIONS_PER_DAY;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export async function getGuestUsageToday(userId: string): Promise<number> {
  const row = await prisma.guestUsageDay.findUnique({
    where: { userId_day: { userId, day: todayUtc() } },
    select: { count: true },
  });
  return row?.count ?? 0;
}

export async function incrementGuestUsageToday(userId: string): Promise<void> {
  const day = todayUtc();
  await prisma.guestUsageDay.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
  });
}

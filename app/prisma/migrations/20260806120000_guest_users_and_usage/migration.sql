-- Guest users + daily usage counter.
--
-- Auth.js keeps its own rows in "User"; we add:
--   * nullable email (guests don't have one yet)
--   * isGuest flag + opaque guestToken for pre-auth session resolution
--   * GuestUsageDay table for a lightweight per-guest daily rate limit

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "guestToken" TEXT;

CREATE UNIQUE INDEX "User_guestToken_key" ON "User"("guestToken");

CREATE TABLE "GuestUsageDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GuestUsageDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestUsageDay_userId_day_key"
    ON "GuestUsageDay"("userId", "day");

ALTER TABLE "GuestUsageDay"
    ADD CONSTRAINT "GuestUsageDay_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename Consult.aiUrgency -> Consult.urgency in place so existing rows keep their value.
ALTER TABLE "Consult" RENAME COLUMN "aiUrgency" TO "urgency";

-- ConsultMessage: transcript of every turn in the two-stage flow.
CREATE TYPE "ConsultMessageRole" AS ENUM ('owner', 'system', 'ai');

CREATE TABLE "ConsultMessage" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "role" "ConsultMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsultMessage_consultId_createdAt_idx"
    ON "ConsultMessage"("consultId", "createdAt");

ALTER TABLE "ConsultMessage"
    ADD CONSTRAINT "ConsultMessage_consultId_fkey"
    FOREIGN KEY ("consultId") REFERENCES "Consult"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

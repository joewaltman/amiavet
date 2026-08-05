-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'vet', 'admin');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('ai_answered', 'review_requested', 'reviewed', 'video_booked', 'closed');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('info', 'monitor', 'see_vet', 'urgent');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('owner', 'ai', 'vet', 'system');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('fine_at_home', 'monitor', 'see_vet', 'urgent');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('vet_review', 'video_visit');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('pending', 'booked', 'completed', 'canceled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" TEXT,
    "birthdateOrAge" TEXT,
    "weightLbs" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetSummary" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "runningSummary" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consult" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ConsultStatus" NOT NULL DEFAULT 'ai_answered',
    "urgency" "Urgency" NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultMessage" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetReview" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "verdict" "Verdict",
    "feedbackToOwner" TEXT,
    "aiProbeLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VetReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caLicenseNumber" TEXT NOT NULL,
    "plitOnFile" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "stripeSessionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoBooking" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "vetId" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL,
    "consultId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PetSummary_petId_key" ON "PetSummary"("petId");

-- CreateIndex
CREATE INDEX "Consult_userId_idx" ON "Consult"("userId");

-- CreateIndex
CREATE INDEX "Consult_petId_idx" ON "Consult"("petId");

-- CreateIndex
CREATE INDEX "Consult_status_idx" ON "Consult"("status");

-- CreateIndex
CREATE INDEX "ConsultMessage_consultId_idx" ON "ConsultMessage"("consultId");

-- CreateIndex
CREATE UNIQUE INDEX "VetReview_consultId_key" ON "VetReview"("consultId");

-- CreateIndex
CREATE INDEX "VetReview_vetId_idx" ON "VetReview"("vetId");

-- CreateIndex
CREATE INDEX "VetReview_status_idx" ON "VetReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vet_userId_key" ON "Vet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Payment_consultId_idx" ON "Payment"("consultId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoBooking_consultId_key" ON "VideoBooking"("consultId");

-- CreateIndex
CREATE INDEX "AiLog_consultId_idx" ON "AiLog"("consultId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetSummary" ADD CONSTRAINT "PetSummary_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consult" ADD CONSTRAINT "Consult_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consult" ADD CONSTRAINT "Consult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultMessage" ADD CONSTRAINT "ConsultMessage_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetReview" ADD CONSTRAINT "VetReview_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetReview" ADD CONSTRAINT "VetReview_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "Vet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vet" ADD CONSTRAINT "Vet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoBooking" ADD CONSTRAINT "VideoBooking_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLog" ADD CONSTRAINT "AiLog_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE SET NULL ON UPDATE CASCADE;


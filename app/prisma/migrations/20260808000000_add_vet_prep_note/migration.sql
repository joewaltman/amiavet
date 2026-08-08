-- Add a short vet-facing prep note + its generation timestamp to Consult.
-- The full case page is still the source of truth; this is a cached
-- 3-4 line summary generated when a review is requested or a video visit
-- is booked, so the vet sees context up front and in email.
ALTER TABLE "Consult" ADD COLUMN "vetPrepNote" TEXT;
ALTER TABLE "Consult" ADD COLUMN "vetPrepNoteAt" TIMESTAMP(3);

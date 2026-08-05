-- Rename Pet.weightKg -> Pet.weightLb and convert any existing values
-- from kilograms to pounds. Hand-written (rather than a drop/recreate)
-- so we don't lose data.
ALTER TABLE "Pet" RENAME COLUMN "weightKg" TO "weightLb";
UPDATE "Pet" SET "weightLb" = "weightLb" * 2.20462 WHERE "weightLb" IS NOT NULL;

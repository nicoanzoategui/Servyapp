-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "address" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "after_hours_available" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payout_institution" TEXT,
ADD COLUMN     "payout_account_type" TEXT,
ADD COLUMN     "tax_id" TEXT;
